import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import twilio from "twilio";

const config = {
  accountSid: process.env.TWILIO_ACCOUNT_SID!,
  authToken: process.env.TWILIO_AUTH_TOKEN!,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
};

const client = twilio(config.accountSid, config.authToken);

/**
 * Make an outbound call that bridges to your phone first,
 * then connects to the contact
 */
export async function POST(req: Request) {
  // Require SEND_MESSAGES permission (ADMIN, EDITOR)
  const auth = await requirePermission("SEND_MESSAGES");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { contactId, to, from } = body; // 'from' is YOUR phone number

    if (!to) {
      return NextResponse.json(
        { error: "Destination phone number is required" },
        { status: 400 }
      );
    }

    // If 'from' (your phone) is provided, create a bridged call
    // Otherwise, create a direct automated call
    let twimlUrl: string;
    
    if (from) {
      // Bridge call: Calls YOUR phone first, then connects to contact
      twimlUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/twiml?to=${encodeURIComponent(to)}`;
      
      // Call YOUR phone first
      const call = await client.calls.create({
        url: twimlUrl,
        to: from, // Calls YOU first
        from: config.phoneNumber,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-voice`,
        statusCallbackEvent: ["completed", "answered", "ringing"],
      });

      // Log the call in messages
      if (contactId) {
        await prisma.message.create({
          data: {
            contactId,
            userId: auth.session!.userId, // Track who made the call
            channel: "VOICE",
            direction: "OUTBOUND",
            status: "SENT",
            content: `Bridge call initiated: You → Contact (${to})`,
            externalId: call.sid,
            sentAt: new Date(),
          },
        });

        // Update contact's last contacted time
        await prisma.contact.update({
          where: { id: contactId },
          data: { lastContactedAt: new Date() },
        });

        // Track analytics
        await prisma.analytics.create({
          data: {
            contactId,
            channel: "VOICE",
            eventType: "call_initiated",
            eventData: { callSid: call.sid, type: "bridge" },
          },
        });
      }

      return NextResponse.json({
        success: true,
        callSid: call.sid,
        message: "Bridge call initiated. You will receive a call first, then we'll connect you to the contact.",
      });
    } else {
      // Direct call (automated message only)
      twimlUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/twiml`;
      
      const call = await client.calls.create({
        url: twimlUrl,
        to: to,
        from: config.phoneNumber,
      });

      return NextResponse.json({
        success: true,
        callSid: call.sid,
        message: "Automated call initiated to contact.",
      });
    }
  } catch (error: any) {
    console.error("Make call error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to make call" },
      { status: 500 }
    );
  }
}

/**
 * Get call details
 */
export async function GET(req: Request) {
  // Require VIEW_MESSAGES permission (ADMIN, EDITOR, VIEWER)
  const auth = await requirePermission("VIEW_MESSAGES");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const callSid = searchParams.get("callSid");

    if (!callSid) {
      return NextResponse.json(
        { error: "Call SID is required" },
        { status: 400 }
      );
    }

    const call = await client.calls(callSid).fetch();

    return NextResponse.json({ call });
  } catch (error: any) {
    console.error("Get call details error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get call details" },
      { status: 500 }
    );
  }
}
