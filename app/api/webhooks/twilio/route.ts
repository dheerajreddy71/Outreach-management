import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processInboundMessage, validateWebhook } from "@/lib/integrations";
import { validateTwilioSignature } from "@/lib/twilio";
import { emitNewMessage } from "@/lib/socket";
import type { TwilioWebhookPayload } from "@/types";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const payload: TwilioWebhookPayload = Object.fromEntries(
      new URLSearchParams(body)
    ) as any;

    // Validate Twilio signature
    const signature = req.headers.get("x-twilio-signature") || "";
    const url = req.url;
    
    if (!validateTwilioSignature(signature, url, payload)) {
      console.error("Invalid Twilio signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Determine channel
    const channel = payload.From.includes("whatsapp:") ? "WHATSAPP" : "SMS";

    // Validate webhook payload
    if (!validateWebhook(channel, payload)) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // Process inbound message
    const inboundData = await processInboundMessage(channel, payload);

    // Find or create contact
    const phoneNumber = inboundData.from.replace("whatsapp:", "");
    let contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: phoneNumber },
          { whatsapp: phoneNumber },
        ],
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phone: phoneNumber,
          ...(channel === "WHATSAPP" ? { whatsapp: phoneNumber } : {}),
          status: "ACTIVE",
        },
      });

      // Track new contact analytics
      await prisma.analytics.create({
        data: {
          contactId: contact.id,
          channel,
          eventType: "contact_created_inbound",
        },
      });
    }

    // Save message to database
    const message = await prisma.message.create({
      data: {
        contactId: contact.id,
        channel,
        direction: "INBOUND",
        status: "DELIVERED",
        content: inboundData.content,
        attachments: inboundData.attachments || [],
        externalId: inboundData.externalId,
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
      include: {
        contact: true,
      },
    });

    // Update contact's last contacted time
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastContactedAt: new Date() },
    });

    // Track analytics
    await prisma.analytics.create({
      data: {
        contactId: contact.id,
        channel,
        eventType: "message_received",
        eventData: { messageId: message.id },
      },
    });

    // Emit WebSocket event for real-time updates
    emitNewMessage(contact.id, message);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Twilio webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
