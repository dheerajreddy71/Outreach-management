/**
 * Advanced Analytics and Conversion Tracking
 * Provides deeper insights into customer journey and conversions
 */

import { prisma } from "./prisma";

export interface ConversionFunnel {
  stage: string;
  contacts: number;
  conversionRate: number;
}

export interface LeadSource {
  source: string;
  count: number;
  conversionRate: number;
}

export interface TeamPerformance {
  userId: string;
  userName: string;
  messagesSent: number;
  responsesReceived: number;
  contactsManaged: number;
  avgResponseTime: number;
}

/**
 * Get conversion funnel data
 * Tracks contacts through: LEAD → ACTIVE → Tagged as Customer → INACTIVE
 */
export async function getConversionFunnel(
  dateRange?: { start: Date; end: Date }
): Promise<ConversionFunnel[]> {
  const where = dateRange
    ? {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }
    : {};

  const [total, leads, active, customers, inactive] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.count({ where: { ...where, status: "LEAD" } }),
    prisma.contact.count({ where: { ...where, status: "ACTIVE" } }),
    prisma.contact.count({ 
      where: { 
        ...where, 
        tags: { has: "customer" }
      } 
    }),
    prisma.contact.count({ where: { ...where, status: "INACTIVE" } }),
  ]);

  return [
    {
      stage: "Total Contacts",
      contacts: total,
      conversionRate: 100,
    },
    {
      stage: "Leads",
      contacts: leads,
      conversionRate: total > 0 ? (leads / total) * 100 : 0,
    },
    {
      stage: "Active",
      contacts: active,
      conversionRate: leads > 0 ? (active / leads) * 100 : 0,
    },
    {
      stage: "Customers",
      contacts: customers,
      conversionRate: active > 0 ? (customers / active) * 100 : 0,
    },
    {
      stage: "Inactive",
      contacts: inactive,
      conversionRate: total > 0 ? (inactive / total) * 100 : 0,
    },
  ];
}

/**
 * Get lead sources and their conversion rates
 */
export async function getLeadSources(): Promise<LeadSource[]> {
  const contacts = await prisma.contact.findMany({
    select: {
      customFields: true,
      status: true,
      tags: true,
    },
  });

  const sourceMap = new Map<string, { total: number; converted: number }>();

  for (const contact of contacts) {
    const source =
      (contact.customFields as any)?.source ||
      (contact.customFields as any)?.leadSource ||
      "unknown";
    const isConverted = contact.tags?.includes("customer") || false;

    if (!sourceMap.has(source)) {
      sourceMap.set(source, { total: 0, converted: 0 });
    }

    const data = sourceMap.get(source)!;
    data.total++;
    if (isConverted) data.converted++;
  }

  return Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      count: data.total,
      conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get team member performance metrics
 */
export async function getTeamPerformance(
  dateRange?: { start: Date; end: Date }
): Promise<TeamPerformance[]> {
  const where = dateRange
    ? {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }
    : {};

  const users = await prisma.user.findMany({
    include: {
      messages: {
        where,
      },
      assignments: {
        where: {
          assignedAt: dateRange
            ? {
                gte: dateRange.start,
                lte: dateRange.end,
              }
            : undefined,
        },
      },
    },
  });

  const performance: TeamPerformance[] = [];

  for (const user of users) {
    const messagesSent = user.messages.filter((m) => m.direction === "OUTBOUND").length;
    const responsesReceived = user.messages.filter((m) => m.direction === "INBOUND").length;
    const contactsManaged = user.assignments.length;

    // Calculate average response time
    const outboundMessages = user.messages
      .filter((m) => m.direction === "OUTBOUND")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 0; i < outboundMessages.length; i++) {
      const outbound = outboundMessages[i];
      const nextInbound = user.messages.find(
        (m) =>
          m.direction === "INBOUND" &&
          m.contactId === outbound.contactId &&
          m.createdAt > outbound.createdAt
      );

      if (nextInbound) {
        const responseTime =
          (nextInbound.createdAt.getTime() - outbound.createdAt.getTime()) / 1000 / 60; // minutes
        totalResponseTime += responseTime;
        responseCount++;
      }
    }

    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    performance.push({
      userId: user.id,
      userName: user.name || user.email,
      messagesSent,
      responsesReceived,
      contactsManaged,
      avgResponseTime,
    });
  }

  return performance.sort((a, b) => b.messagesSent - a.messagesSent);
}

/**
 * Get contact engagement scores
 * Based on message frequency, response rate, and recency
 */
export async function getContactEngagementScores(limit = 10): Promise<
  Array<{
    contactId: string;
    contactName: string;
    score: number;
    messageCount: number;
    lastMessageDate: Date;
  }>
> {
  const contacts = await prisma.contact.findMany({
    where: {
      status: { not: "INACTIVE" },
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
    take: 100,
  });

  const scored = contacts.map((contact) => {
    const messages = contact.messages;
    const messageCount = messages.length;

    if (messageCount === 0) {
      return null;
    }

    // Recency score (0-40 points): More recent = higher score
    const lastMessage = messages[0];
    const daysSinceLastMessage = Math.floor(
      (Date.now() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyScore = Math.max(0, 40 - daysSinceLastMessage);

    // Frequency score (0-30 points): More messages = higher score
    const frequencyScore = Math.min(30, messageCount * 2);

    // Response rate score (0-30 points)
    const outbound = messages.filter((m) => m.direction === "OUTBOUND").length;
    const inbound = messages.filter((m) => m.direction === "INBOUND").length;
    const responseRate = outbound > 0 ? inbound / outbound : 0;
    const responseScore = Math.min(30, responseRate * 30);

    const totalScore = recencyScore + frequencyScore + responseScore;

    return {
      contactId: contact.id,
      contactName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email || "Unknown",
      score: Math.round(totalScore),
      messageCount,
      lastMessageDate: lastMessage.createdAt,
    };
  });

  return scored
    .filter((s) => s !== null)
    .sort((a, b) => b!.score - a!.score)
    .slice(0, limit) as any;
}

/**
 * Get channel effectiveness metrics
 */
export async function getChannelEffectiveness(): Promise<
  Array<{
    channel: string;
    messagesSent: number;
    responseRate: number;
    avgResponseTime: number;
    conversionRate: number;
  }>
> {
  const channels = ["SMS", "WHATSAPP", "EMAIL", "VOICE", "TWITTER", "FACEBOOK"];
  const results = [];

  for (const channel of channels) {
    const outbound = await prisma.message.count({
      where: {
        channel: channel as any,
        direction: "OUTBOUND",
      },
    });

    const inbound = await prisma.message.count({
      where: {
        channel: channel as any,
        direction: "INBOUND",
      },
    });

    // Calculate conversions (contacts that became customer - tagged as such)
    const conversions = await prisma.contact.count({
      where: {
        tags: { has: "customer" },
        messages: {
          some: {
            channel: channel as any,
          },
        },
      },
    });

    const totalContacts = await prisma.contact.count({
      where: {
        messages: {
          some: {
            channel: channel as any,
          },
        },
      },
    });

    // Calculate average response time (time between outbound and inbound messages)
    const responsePairs = await prisma.$queryRaw<Array<{ avg_response_time: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (inbound.created_at - outbound.created_at)) / 60) as avg_response_time
      FROM messages outbound
      JOIN messages inbound ON outbound.contact_id = inbound.contact_id
      WHERE outbound.channel = ${channel}
        AND outbound.direction = 'OUTBOUND'
        AND inbound.direction = 'INBOUND'
        AND inbound.created_at > outbound.created_at
        AND inbound.created_at < outbound.created_at + INTERVAL '24 hours'
      LIMIT 1000
    `;

    const avgResponseTime = responsePairs[0]?.avg_response_time || 0;

    results.push({
      channel,
      messagesSent: outbound,
      responseRate: outbound > 0 ? (inbound / outbound) * 100 : 0,
      avgResponseTime: Number(avgResponseTime) || 0,
      conversionRate: totalContacts > 0 ? (conversions / totalContacts) * 100 : 0,
    });
  }

  return results.sort((a, b) => b.messagesSent - a.messagesSent);
}
