import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { sendMessage } from "@/lib/integrations";
import { sendMessageSchema } from "@/lib/validations";
import { emitNewMessage } from "@/lib/socket";
import { addRateLimitHeaders } from "@/lib/rate-limiter";

/**
 * Convert relative paths to absolute URLs for media attachments
 */
function convertToAbsoluteUrls(attachments: string[] | undefined): string[] | undefined {
  if (!attachments || attachments.length === 0) return attachments;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  
  const absoluteUrls = attachments.map(url => {
    // If already absolute URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Convert relative path to absolute URL
    const absoluteUrl = `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
    return absoluteUrl;
  });

  console.log('Converting attachments:', {
    original: attachments,
    baseUrl,
    absolute: absoluteUrls
  });

  return absoluteUrls;
}

export async function GET(req: Request) {
  // Require VIEW_MESSAGES permission (ADMIN, EDITOR, VIEWER)
  const auth = await requirePermission("VIEW_MESSAGES");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");
    const channel = searchParams.get("channel");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (contactId) where.contactId = contactId;
    if (channel) where.channel = channel;

    const messages = await prisma.message.findMany({
      where,
      include: {
        contact: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    // Get IP for rate limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const response = NextResponse.json({ messages });
    return addRateLimitHeaders(response, ip, "api");
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  // Require SEND_MESSAGES permission (ADMIN, EDITOR)
  const auth = await requirePermission("SEND_MESSAGES");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const validated = sendMessageSchema.parse(body);

    // Get contact details
    const contact = await prisma.contact.findUnique({
      where: { id: validated.contactId },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Determine recipient based on channel
    let recipient = "";
    switch (validated.channel) {
      case "SMS":
        recipient = contact.phone || "";
        break;
      case "WHATSAPP":
        recipient = contact.whatsapp || contact.phone || "";
        break;
      case "EMAIL":
        recipient = contact.email || "";
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported channel" },
          { status: 400 }
        );
    }

    if (!recipient) {
      return NextResponse.json(
        { error: `No ${validated.channel} contact information available` },
        { status: 400 }
      );
    }

    // Convert relative paths to absolute URLs for Twilio/external services
    const absoluteAttachments = convertToAbsoluteUrls(validated.attachments);

    // Skip attachments in development if using localhost (Twilio can't access localhost)
    const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') || 
                        (!process.env.NEXT_PUBLIC_APP_URL && !process.env.VERCEL_URL);
    
    const attachmentsToSend = (isLocalhost && absoluteAttachments?.some(url => url.includes('localhost'))) 
      ? undefined 
      : absoluteAttachments;

    if (isLocalhost && validated.attachments && validated.attachments.length > 0) {
      console.warn('⚠️ Skipping attachments in development mode - Twilio cannot access localhost URLs');
      console.warn('💡 To test attachments: Use ngrok or deploy to a public URL');
    }

    // Send message through integration
    const result = await sendMessage({
      channel: validated.channel,
      to: recipient,
      content: validated.content,
      attachments: attachmentsToSend,
    });

    if (!result.success) {
      // Save failed message to database
      const message = await prisma.message.create({
        data: {
          contactId: validated.contactId,
          userId: auth.session!.userId, // Track who sent the message
          channel: validated.channel,
          direction: "OUTBOUND",
          status: "FAILED",
          content: validated.content,
          attachments: validated.attachments || [],
          errorMessage: result.error,
        },
        include: {
          contact: true,
          user: true,
        },
      });

      return NextResponse.json(
        { error: result.error, message },
        { status: 500 }
      );
    }

    // Save successful message to database
    const message = await prisma.message.create({
      data: {
        contactId: validated.contactId,
        userId: auth.session!.userId, // Track who sent the message
        channel: validated.channel,
        direction: "OUTBOUND",
        status: "SENT",
        content: validated.content,
        attachments: validated.attachments || [],
        externalId: result.externalId,
        sentAt: new Date(),
      },
      include: {
        contact: true,
        user: true,
      },
    });

    // Update contact's last contacted time
    await prisma.contact.update({
      where: { id: validated.contactId },
      data: { lastContactedAt: new Date() },
    });

    // Track analytics
    await prisma.analytics.create({
      data: {
        contactId: validated.contactId,
        channel: validated.channel,
        eventType: "message_sent",
        eventData: { messageId: message.id },
      },
    });

    // Emit WebSocket event for real-time updates
    emitNewMessage(validated.contactId, message);

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
