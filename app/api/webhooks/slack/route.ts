import { NextRequest, NextResponse } from "next/server";

/**
 * Slack Webhook Handler
 * Sends notifications to Slack when certain events occur
 * 
 * Setup:
 * 1. Create a Slack app at api.slack.com/apps
 * 2. Enable Incoming Webhooks
 * 3. Add webhook URL to .env: SLACK_WEBHOOK_URL
 * 4. This endpoint receives internal events and forwards to Slack
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function POST(req: NextRequest) {
  try {
    if (!SLACK_WEBHOOK_URL) {
      return NextResponse.json(
        { error: "Slack webhook not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { eventType, data } = body;

    let slackMessage = "";

    switch (eventType) {
      case "new_message":
        slackMessage = formatNewMessageNotification(data);
        break;
      
      case "new_contact":
        slackMessage = formatNewContactNotification(data);
        break;
      
      case "missed_call":
        slackMessage = formatMissedCallNotification(data);
        break;
      
      case "lead_conversion":
        slackMessage = formatLeadConversionNotification(data);
        break;
      
      default:
        slackMessage = `New event: ${eventType}`;
    }

    // Send to Slack
    await sendToSlack(slackMessage, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Slack webhook error:", error);
    return NextResponse.json(
      { error: "Failed to send Slack notification" },
      { status: 500 }
    );
  }
}

async function sendToSlack(text: string, data: any) {
  if (!SLACK_WEBHOOK_URL) return;

  const payload = {
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_Sent from Unified Outreach Platform at ${new Date().toLocaleString()}_`,
          },
        ],
      },
    ],
  };

  await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function formatNewMessageNotification(data: any): string {
  const { contact, channel, content } = data;
  return `🆕 *New ${channel} Message*\n` +
    `From: *${contact.firstName} ${contact.lastName}*\n` +
    `Message: _${content.substring(0, 100)}${content.length > 100 ? "..." : ""}_\n` +
    `<${process.env.NEXT_PUBLIC_APP_URL}/inbox|View in Inbox>`;
}

function formatNewContactNotification(data: any): string {
  const { contact, source } = data;
  return `👤 *New Contact Added*\n` +
    `Name: *${contact.firstName} ${contact.lastName}*\n` +
    `${contact.email ? `Email: ${contact.email}\n` : ""}` +
    `${contact.phone ? `Phone: ${contact.phone}\n` : ""}` +
    `Source: ${source || "Manual"}\n` +
    `<${process.env.NEXT_PUBLIC_APP_URL}/contacts|View Contacts>`;
}

function formatMissedCallNotification(data: any): string {
  const { contact, timestamp } = data;
  return `📞 *Missed Call*\n` +
    `From: *${contact.firstName} ${contact.lastName}*\n` +
    `Phone: ${contact.phone}\n` +
    `Time: ${new Date(timestamp).toLocaleString()}\n` +
    `<${process.env.NEXT_PUBLIC_APP_URL}/inbox|Call Back>`;
}

function formatLeadConversionNotification(data: any): string {
  const { contact, fromStatus, toStatus } = data;
  return `🎉 *Lead Converted!*\n` +
    `Contact: *${contact.firstName} ${contact.lastName}*\n` +
    `Status: ${fromStatus} → ${toStatus}\n` +
    `<${process.env.NEXT_PUBLIC_APP_URL}/contacts|View Contact>`;
}
