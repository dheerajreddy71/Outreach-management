import cron from "node-cron";
import { prisma } from "./prisma";
import { sendMessage } from "./integrations";

/**
 * Background worker to process scheduled messages
 * Runs every minute to check for messages that need to be sent
 */
let isSchedulerRunning = false;

export function startScheduler() {
  if (isSchedulerRunning) {
    console.log("⚠️ Scheduler already running, skipping...");
    return;
  }
  
  isSchedulerRunning = true;
  console.log("📅 Message scheduler started");

  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      console.log(`🔍 Checking for scheduled messages at ${now.toISOString()}`);

      // Find pending scheduled messages that should be sent
      const pendingMessages = await prisma.scheduledMessage.findMany({
        where: {
          status: "PENDING",
          scheduledAt: {
            lte: now,
          },
        },
        include: {
          contact: true,
          user: true,
        },
        take: 50, // Process batch of 50
      });

      if (pendingMessages.length === 0) {
        console.log("  ℹ️ No pending messages to process");
        return;
      }

      console.log(`📨 Processing ${pendingMessages.length} scheduled messages`);

      for (const scheduled of pendingMessages) {
        try {
          // Determine recipient based on channel
          let recipient = "";
          switch (scheduled.channel) {
            case "SMS":
              recipient = scheduled.contact.phone || "";
              break;
            case "WHATSAPP":
              recipient = scheduled.contact.whatsapp || scheduled.contact.phone || "";
              break;
            case "EMAIL":
              recipient = scheduled.contact.email || "";
              break;
            default:
              throw new Error(`Unsupported channel: ${scheduled.channel}`);
          }

          if (!recipient) {
            throw new Error(`No ${scheduled.channel} contact information available`);
          }

          // Send the message
          const result = await sendMessage({
            channel: scheduled.channel,
            to: recipient,
            content: scheduled.content,
          });

          if (result.success) {
            // Update scheduled message status
            await prisma.scheduledMessage.update({
              where: { id: scheduled.id },
              data: {
                status: "SENT",
                sentAt: new Date(),
              },
            });

            // Create message record
            await prisma.message.create({
              data: {
                contactId: scheduled.contactId,
                userId: scheduled.userId,
                channel: scheduled.channel,
                direction: "OUTBOUND",
                status: "SENT",
                content: scheduled.content,
                externalId: result.externalId,
                sentAt: new Date(),
              },
            });

            // Update contact's last contacted time
            await prisma.contact.update({
              where: { id: scheduled.contactId },
              data: { lastContactedAt: new Date() },
            });

            // Track analytics
            await prisma.analytics.create({
              data: {
                contactId: scheduled.contactId,
                channel: scheduled.channel,
                eventType: "scheduled_message_sent",
                eventData: { scheduledMessageId: scheduled.id },
              },
            });

            console.log(`✅ Sent scheduled message ${scheduled.id} to ${recipient}`);
          } else {
            throw new Error(result.error || "Failed to send message");
          }
        } catch (error: any) {
          console.error(`❌ Failed to send scheduled message ${scheduled.id}:`, error.message);

          // Mark as failed
          await prisma.scheduledMessage.update({
            where: { id: scheduled.id },
            data: {
              status: "FAILED",
              errorMessage: error.message,
            },
          });
        }
      }
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  });
}
