import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "@/lib/twilio";
import { emailIntegration } from "@/lib/sendgrid";

/**
 * Zapier Webhook Handler
 * Receives actions from Zapier and executes them
 * Also provides triggers for Zapier to subscribe to
 * 
 * Setup in Zapier:
 * 1. Create a "Webhooks by Zapier" trigger
 * 2. Set webhook URL to: https://your-domain.com/api/webhooks/zapier
 * 3. Use POST method with JSON payload
 * 
 * Supported Actions:
 * - create_contact
 * - send_message
 * - add_note
 * - update_contact_status
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data } = body;

    console.log("Zapier webhook received:", action);

    let result;

    switch (action) {
      case "create_contact":
        result = await handleCreateContact(data);
        break;
      
      case "send_message":
        result = await handleSendMessage(data);
        break;
      
      case "add_note":
        result = await handleAddNote(data);
        break;
      
      case "update_contact_status":
        result = await handleUpdateContactStatus(data);
        break;
      
      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Zapier webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process Zapier action" },
      { status: 500 }
    );
  }
}

async function handleCreateContact(data: any) {
  const { firstName, lastName, email, phone, company, jobTitle, tags } = data;

  // Check for duplicates
  const existing = await prisma.contact.findFirst({
    where: {
      OR: [
        { email: email || undefined },
        { phone: phone || undefined },
      ],
    },
  });

  if (existing) {
    return { contactId: existing.id, message: "Contact already exists" };
  }

  // Create contact
  const contact = await prisma.contact.create({
    data: {
      firstName: firstName || null,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null,
      company: company || null,
      jobTitle: jobTitle || null,
      tags: tags ? tags.split(",").map((t: string) => t.trim()) : [],
      status: "LEAD",
      customFields: {
        source: "zapier",
      },
    },
  });

  // Track analytics
  await prisma.analytics.create({
    data: {
      contactId: contact.id,
      channel: "EMAIL",
      eventType: "contact_created_via_zapier",
    },
  });

  return { contactId: contact.id, message: "Contact created successfully" };
}

async function handleSendMessage(data: any) {
  const { contactId, email, phone, channel, content } = data;

  let contact;

  if (contactId) {
    contact = await prisma.contact.findUnique({ where: { id: contactId } });
  } else if (email) {
    contact = await prisma.contact.findFirst({ where: { email } });
  } else if (phone) {
    contact = await prisma.contact.findFirst({ where: { phone } });
  }

  if (!contact) {
    throw new Error("Contact not found");
  }

  // Get first user as sender
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No user found");
  }

  // Create message
  const message = await prisma.message.create({
    data: {
      contactId: contact.id,
      userId: user.id,
      channel: channel || "EMAIL",
      direction: "OUTBOUND",
      status: "QUEUED",
      content,
    },
  });

  // Actually send the message via the channel integration
  try {
    const channelToUse = (channel || "EMAIL").toUpperCase();
    
    if (channelToUse === "SMS" && contact.phone) {
      await twilio.sms.send({
        to: contact.phone,
        content: content,
      });
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "SENT" },
      });
    } else if (channelToUse === "WHATSAPP" && contact.whatsapp) {
      await twilio.whatsapp.send({
        to: contact.whatsapp,
        content: content,
      });
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "SENT" },
      });
    } else if (channelToUse === "EMAIL" && contact.email) {
      await emailIntegration.send({
        to: contact.email,
        content: content,
      });
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "SENT" },
      });
    } else {
      // Invalid channel or missing contact info - leave as QUEUED
      return { messageId: message.id, message: "Message queued (channel/contact info unavailable)" };
    }
  } catch (error) {
    console.error("Failed to send message:", error);
    await prisma.message.update({
      where: { id: message.id },
      data: { status: "FAILED" },
    });
    return { messageId: message.id, message: "Message failed to send", error: String(error) };
  }

  return { messageId: message.id, message: "Message sent successfully" };
}

async function handleAddNote(data: any) {
  const { contactId, email, phone, content, visibility } = data;

  let contact;

  if (contactId) {
    contact = await prisma.contact.findUnique({ where: { id: contactId } });
  } else if (email) {
    contact = await prisma.contact.findFirst({ where: { email } });
  } else if (phone) {
    contact = await prisma.contact.findFirst({ where: { phone } });
  }

  if (!contact) {
    throw new Error("Contact not found");
  }

  // Get first user as author
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No user found");
  }

  const note = await prisma.note.create({
    data: {
      contactId: contact.id,
      userId: user.id,
      content,
      visibility: visibility || "TEAM",
    },
  });

  return { noteId: note.id, message: "Note added successfully" };
}

async function handleUpdateContactStatus(data: any) {
  const { contactId, email, phone, status } = data;

  let contact;

  if (contactId) {
    contact = await prisma.contact.findUnique({ where: { id: contactId } });
  } else if (email) {
    contact = await prisma.contact.findFirst({ where: { email } });
  } else if (phone) {
    contact = await prisma.contact.findFirst({ where: { phone } });
  }

  if (!contact) {
    throw new Error("Contact not found");
  }

  const validStatuses = ["LEAD", "ACTIVE", "INACTIVE", "BLOCKED", "UNSUBSCRIBED"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: { status },
  });

  return { contactId: contact.id, message: "Contact status updated successfully" };
}

// GET handler for Zapier to test the webhook
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Zapier webhook endpoint is active",
    supportedActions: [
      "create_contact",
      "send_message",
      "add_note",
      "update_contact_status",
    ],
    documentation: `${process.env.NEXT_PUBLIC_APP_URL}/docs/zapier`,
  });
}
