import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSocketServer } from "@/lib/socket";

/**
 * POST /api/webhooks/sendgrid/inbound - SendGrid Inbound Parse Webhook
 * Receives incoming emails and creates message records
 * 
 * Setup in SendGrid:
 * 1. Go to Settings → Inbound Parse
 * 2. Add domain and subdomain (e.g., inbound.yourdomain.com)
 * 3. Set destination URL: https://your-domain.com/api/webhooks/sendgrid/inbound
 * 4. Configure MX records in your DNS
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    // Extract email data from SendGrid's format
    const from = formData.get("from") as string;
    const to = formData.get("to") as string;
    const subject = formData.get("subject") as string || "(No Subject)";
    const text = formData.get("text") as string;
    const html = formData.get("html") as string;
    const envelope = formData.get("envelope") as string;
    
    console.log("📧 Inbound email received from:", from);

    // Extract sender email address
    const senderEmailMatch = from.match(/<(.+?)>/);
    const senderEmail = senderEmailMatch ? senderEmailMatch[1] : from;

    // Find or create contact
    let contact = await prisma.contact.findUnique({
      where: { email: senderEmail },
    });

    if (!contact) {
      // Extract sender name from email
      const senderName = from.replace(/<.+?>/, "").trim();
      const [firstName, ...lastNameParts] = senderName.split(" ");

      contact = await prisma.contact.create({
        data: {
          email: senderEmail,
          firstName: firstName || undefined,
          lastName: lastNameParts.join(" ") || undefined,
          status: "ACTIVE",
        },
      });
      console.log(`✅ Created new contact from inbound email: ${senderEmail}`);
    }

    // Create message record
    const message = await prisma.message.create({
      data: {
        contactId: contact.id,
        channel: "EMAIL",
        direction: "INBOUND",
        status: "SENT", // Using SENT as closest match to received
        content: `Subject: ${subject}\n\n${text || html || ""}`,
        metadata: {
          subject,
          from,
          to,
          hasHtml: !!html,
        },
        sentAt: new Date(),
      },
      include: {
        contact: true,
      },
    });

    // Broadcast via WebSocket for real-time updates
    const io = getSocketServer();
    if (io) {
      io.to(`contact:${contact.id}`).emit("message:new", {
        message: {
          id: message.id,
          content: message.content,
          channel: message.channel,
          direction: message.direction,
          status: message.status,
          createdAt: message.createdAt,
          contact: {
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
          },
        },
      });
    }

    // Track analytics
    await prisma.analytics.create({
      data: {
        contactId: contact.id,
        channel: "EMAIL",
        eventType: "inbound_message",
        eventData: { subject, from: senderEmail },
      },
    });

    return NextResponse.json({ 
      success: true, 
      messageId: message.id,
      contactId: contact.id 
    });
  } catch (error: any) {
    console.error("SendGrid inbound webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process inbound email" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/sendgrid/inbound - Health check
 */
export async function GET() {
  return NextResponse.json({ 
    status: "active",
    endpoint: "SendGrid Inbound Parse Webhook",
    instructions: [
      "Configure SendGrid Inbound Parse to point to this URL",
      "Set up MX records for your domain",
      "Emails sent to your inbound domain will be received here"
    ]
  });
}
