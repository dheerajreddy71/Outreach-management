import type { MessageChannel, ChannelIntegration } from "@/types";
import { smsIntegration, whatsappIntegration } from "./twilio";
import { emailIntegration } from "./sendgrid";
import { twitterIntegration } from "./twitter";
import { facebookIntegration } from "./facebook";

/**
 * Factory function to get the appropriate channel integration
 */
export function getChannelIntegration(channel: MessageChannel): ChannelIntegration | null {
  switch (channel) {
    case "SMS":
      return smsIntegration;
    case "WHATSAPP":
      return whatsappIntegration;
    case "EMAIL":
      return emailIntegration;
    case "TWITTER":
      return twitterIntegration;
    case "FACEBOOK":
      return facebookIntegration;
    default:
      return null;
  }
}

/**
 * Send a message through the specified channel
 */
export async function sendMessage(params: {
  channel: MessageChannel;
  to: string;
  content: string;
  attachments?: string[];
}) {
  const integration = getChannelIntegration(params.channel);
  
  if (!integration) {
    return {
      success: false,
      error: `Integration for channel ${params.channel} not implemented`,
    };
  }

  return integration.send({
    to: params.to,
    content: params.content,
    attachments: params.attachments,
  });
}

/**
 * Process inbound message from webhook
 */
export async function processInboundMessage(
  channel: MessageChannel,
  payload: any
) {
  const integration = getChannelIntegration(channel);
  
  if (!integration || !integration.processInbound) {
    throw new Error(`Cannot process inbound for channel ${channel}`);
  }

  return integration.processInbound(payload);
}

/**
 * Validate webhook payload
 */
export function validateWebhook(channel: MessageChannel, payload: any): boolean {
  const integration = getChannelIntegration(channel);
  
  if (!integration || !integration.validateWebhook) {
    return false;
  }

  return integration.validateWebhook(payload);
}

/**
 * Send notification to Slack
 * Helper function to trigger Slack notifications from other parts of the app
 */
export async function notifySlack(eventType: string, data: any) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
    if (!appUrl) {
      console.warn("NEXT_PUBLIC_APP_URL not set, skipping Slack notification");
      return;
    }

    await fetch(`${appUrl}/api/webhooks/slack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, data }),
    });
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
  }
}
