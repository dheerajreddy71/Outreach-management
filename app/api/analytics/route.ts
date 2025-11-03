import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: Request) {
  // Require VIEW_ANALYTICS permission
  const auth = await requirePermission("VIEW_ANALYTICS");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";

    // Calculate date range
    const now = new Date();
    let daysAgo = 30;
    switch (range) {
      case "7d":
        daysAgo = 7;
        break;
      case "30d":
        daysAgo = 30;
        break;
      case "90d":
        daysAgo = 90;
        break;
      case "1y":
        daysAgo = 365;
        break;
    }

    const dateFrom = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Channel Metrics - messages by channel and direction
    const channelMetrics = await prisma.message.groupBy({
      by: ["channel", "direction"],
      _count: { id: true },
      where: {
        createdAt: { gte: dateFrom },
      },
    });

    // Daily Message Volume - for trend chart
    const messages = await prisma.message.findMany({
      where: {
        createdAt: { gte: dateFrom },
      },
      select: {
        createdAt: true,
        channel: true,
      },
    });

    // Group messages by date
    const volumeByDate = messages.reduce((acc: any, msg) => {
      const date = msg.createdAt.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { date, count: 0 };
      }
      acc[date].count++;
      return acc;
    }, {});

    const messageVolumeByDate = Object.values(volumeByDate).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Contact Metrics
    const [totalContacts, activeContacts, newContactsThisWeek, unsubscribed] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { status: "ACTIVE" } }),
      prisma.contact.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.contact.count({ where: { status: "UNSUBSCRIBED" } }),
    ]);

    // Response Metrics - calculate average response time
    const conversations = await prisma.message.findMany({
      where: {
        direction: "INBOUND",
        createdAt: { gte: dateFrom },
      },
      include: {
        contact: {
          include: {
            messages: {
              where: {
                direction: "OUTBOUND",
                createdAt: { gte: dateFrom },
              },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    let totalResponseTime = 0;
    let responseCount = 0;

    conversations.forEach((inbound) => {
      const response = inbound.contact.messages?.[0];
      if (response && response.createdAt > inbound.createdAt) {
        const responseTime =
          (response.createdAt.getTime() - inbound.createdAt.getTime()) / 1000 / 60; // minutes
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    // Message Volume Over Time - daily breakdown
    const messageVolume = await prisma.message.groupBy({
      by: ["channel"],
      _count: { id: true },
      where: {
        createdAt: { gte: dateFrom },
      },
    });

    // Format channel metrics
    const formattedChannelMetrics = Object.values(
      channelMetrics.reduce((acc: any, item) => {
        if (!acc[item.channel]) {
          acc[item.channel] = {
            channel: item.channel,
            totalSent: 0,
            totalReceived: 0,
            deliveryRate: 0,
            averageResponseTime: 0,
          };
        }
        if (item.direction === "OUTBOUND") {
          acc[item.channel].totalSent = item._count.id;
        } else {
          acc[item.channel].totalReceived = item._count.id;
        }
        return acc;
      }, {})
    );

    const dashboardMetrics = {
      channelMetrics: formattedChannelMetrics,
      contactMetrics: {
        totalContacts,
        activeContacts,
        newContactsThisWeek,
        unsubscribed,
      },
      responseMetrics: {
        averageFirstResponseTime: averageResponseTime,
        averageResponseTime: averageResponseTime,
        responseRate: responseCount > 0 ? (responseCount / conversations.length) * 100 : 0,
      },
      messageVolume: messageVolumeByDate,
      messageVolumeByChannel: messageVolume.map((item) => ({
        channel: item.channel,
        count: item._count.id,
      })),
    };

    return NextResponse.json(dashboardMetrics);
  } catch (error) {
    console.error("Get analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
