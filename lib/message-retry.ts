/**
 * Message Retry System
 * Automatically retries failed messages with exponential backoff
 */

import { prisma } from "./prisma";
import { sendMessage } from "./integrations";
import { logError, ErrorSeverity } from "./error-logger";

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const defaultConfig: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 5000, // 5 seconds
  maxDelayMs: 300000, // 5 minutes
  backoffMultiplier: 2,
};

/**
 * Process failed messages and retry them
 */
export async function processFailedMessages(): Promise<{
  processed: number;
  retried: number;
  failed: number;
}> {
  let processed = 0;
  let retried = 0;
  let failed = 0;

  try {
    // Find failed messages that haven't exceeded retry limit
    const failedMessages = await prisma.message.findMany({
      where: {
        status: "FAILED",
        retryCount: {
          lt: defaultConfig.maxRetries,
        },
      },
      include: {
        contact: true,
      },
      take: 50, // Process in batches
    });

    processed = failedMessages.length;

    for (const message of failedMessages) {
      try {
        // Calculate delay with exponential backoff
        const retryCount = message.retryCount || 0;
        const delay = Math.min(
          defaultConfig.initialDelayMs * Math.pow(defaultConfig.backoffMultiplier, retryCount),
          defaultConfig.maxDelayMs
        );

        // Check if enough time has passed since last attempt
        const timeSinceFailure = Date.now() - message.updatedAt.getTime();
        if (timeSinceFailure < delay) {
          continue; // Not time to retry yet
        }

        // Determine recipient
        let recipient = "";
        switch (message.channel) {
          case "SMS":
            recipient = message.contact.phone || "";
            break;
          case "WHATSAPP":
            recipient = message.contact.whatsapp || message.contact.phone || "";
            break;
          case "EMAIL":
            recipient = message.contact.email || "";
            break;
          default:
            continue;
        }

        if (!recipient) {
          // Can't retry without recipient
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: "FAILED",
              retryCount: defaultConfig.maxRetries, // Don't retry again
              failureReason: "No recipient information available",
            },
          });
          failed++;
          continue;
        }

        // Attempt to resend
        await sendMessage({
          channel: message.channel,
          to: recipient,
          content: message.content,
          attachments: Array.isArray(message.attachments) ? message.attachments : [],
        });

        // Update message status to SENT
        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: "SENT",
            retryCount: retryCount + 1,
          },
        });

        retried++;

        console.log(`✓ Successfully retried message ${message.id} (attempt ${retryCount + 1})`);
      } catch (error: any) {
        // Retry failed, increment count
        const newRetryCount = (message.retryCount || 0) + 1;

        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: "FAILED",
            retryCount: newRetryCount,
            failureReason: error.message || "Unknown error",
          },
        });

        failed++;

        if (newRetryCount >= defaultConfig.maxRetries) {
          logError(
            error,
            "message_retry",
            ErrorSeverity.HIGH,
            {
              messageId: message.id,
              contactId: message.contactId,
              retryCount: newRetryCount,
            }
          );
        }

        console.error(`✗ Failed to retry message ${message.id}:`, error.message);
      }
    }
  } catch (error: any) {
    logError(error, "message_retry_system", ErrorSeverity.CRITICAL);
    console.error("Message retry system error:", error);
  }

  return { processed, retried, failed };
}

/**
 * Start automatic retry processor (runs every 2 minutes)
 */
export function startRetryProcessor(): NodeJS.Timeout {
  console.log("📨 Starting message retry processor...");

  const interval = setInterval(async () => {
    const result = await processFailedMessages();

    if (result.processed > 0) {
      console.log(
        `📨 Message retry: ${result.processed} processed, ${result.retried} retried, ${result.failed} failed`
      );
    }
  }, 2 * 60 * 1000); // Every 2 minutes

  // Also run immediately
  processFailedMessages();

  return interval;
}

/**
 * Manually retry a specific message
 */
export async function retryMessage(messageId: string): Promise<boolean> {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { contact: true },
    });

    if (!message) {
      throw new Error("Message not found");
    }

    if (message.status !== "FAILED" && message.status !== "QUEUED") {
      throw new Error("Can only retry failed or queued messages");
    }

    // Determine recipient
    let recipient = "";
    switch (message.channel) {
      case "SMS":
        recipient = message.contact.phone || "";
        break;
      case "WHATSAPP":
        recipient = message.contact.whatsapp || message.contact.phone || "";
        break;
      case "EMAIL":
        recipient = message.contact.email || "";
        break;
    }

    if (!recipient) {
      throw new Error("No recipient information available");
    }

    // Send message
    await sendMessage({
      channel: message.channel,
      to: recipient,
      content: message.content,
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
    });

    // Update status
    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: "SENT",
        retryCount: (message.retryCount || 0) + 1,
      },
    });

    return true;
  } catch (error: any) {
    logError(error, "manual_message_retry", ErrorSeverity.MEDIUM, { messageId });
    throw error;
  }
}
