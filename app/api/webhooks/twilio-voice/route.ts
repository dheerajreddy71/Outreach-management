import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Twilio Voice Webhook Handler
 * Handles call status updates (answered, completed, busy, failed, etc.)
 */
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const payload = Object.fromEntries(new URLSearchParams(body)) as any;

    console.log("Voice webhook received:", payload);

    const {
      CallSid,
      CallStatus,
      From,
      To,
      CallDuration,
      Direction,
      RecordingUrl,
    } = payload;

    // Find the message by external ID (CallSid)
    const message = await prisma.message.findFirst({
      where: {
        externalId: CallSid,
        channel: "VOICE",
      },
    });

    if (message) {
      // Update message status based on call status
      let status: "SENT" | "DELIVERED" | "FAILED" | "QUEUED" = "SENT";
      let content = message.content;

      switch (CallStatus) {
        case "completed":
          status = "DELIVERED";
          content = `Voice call completed - Duration: ${CallDuration}s`;
          break;
        case "busy":
        case "failed":
        case "no-answer":
          status = "FAILED";
          content = `Voice call ${CallStatus}`;
          break;
        case "in-progress":
          status = "SENT";
          content = "Voice call in progress";
          break;
        default:
          status = "QUEUED";
      }

      await prisma.message.update({
        where: { id: message.id },
        data: {
          status,
          content,
          deliveredAt: CallStatus === "completed" ? new Date() : null,
        },
      });

      // Track analytics for completed calls
      if (CallStatus === "completed" && message.contactId) {
        await prisma.analytics.create({
          data: {
            contactId: message.contactId,
            channel: "VOICE",
            eventType: "call_completed",
            eventData: {
              callSid: CallSid,
              duration: CallDuration,
              recordingUrl: RecordingUrl,
            },
          },
        });
      }
    }

    // Return TwiML response
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("Voice webhook error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }
}
