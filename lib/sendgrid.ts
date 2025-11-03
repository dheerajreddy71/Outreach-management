import sgMail from "@sendgrid/mail";
import type { ChannelIntegration } from "@/types";

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.warn("⚠️ SENDGRID_API_KEY not configured");
} else {
  sgMail.setApiKey(apiKey);
  console.log("✅ SendGrid initialized");
}

const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@yourdomain.com";
const fromName = process.env.SENDGRID_FROM_NAME || "Unified Outreach";

/**
 * SendGrid Email Integration
 */
export const emailIntegration: ChannelIntegration = {
  send: async ({ to, content, attachments }) => {
    try {
      if (!apiKey) {
        throw new Error("SendGrid API key not configured");
      }

      // Validate email address
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        throw new Error(`Invalid email address: ${to}`);
      }

      // Parse content for subject line (first line or default)
      const lines = content.split("\n");
      let subject = "Message from Unified Outreach";
      let body = content;

      // If content has multiple lines, use first as subject
      if (lines.length > 1 && lines[0].length < 100) {
        subject = lines[0].trim();
        body = lines.slice(1).join("\n").trim();
      }

      // Prepare email message
      const msg: sgMail.MailDataRequired = {
        to,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject,
        text: body,
        html: body.replace(/\n/g, "<br>"),
      };

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        msg.attachments = attachments.map((url) => ({
          content: url, // Base64 encoded or URL
          filename: url.split("/").pop() || "attachment",
          type: "application/octet-stream",
          disposition: "attachment",
        }));
      }

      // Send email
      const [response] = await sgMail.send(msg);

      return {
        success: true,
        externalId: response.headers["x-message-id"] as string || undefined,
      };
    } catch (error: any) {
      console.error("SendGrid send error:", error);
      
      // Extract error message from SendGrid response
      let errorMessage = error.message || "Failed to send email";
      if (error.response?.body?.errors) {
        const errors = error.response.body.errors;
        console.error("SendGrid error details:", JSON.stringify(errors, null, 2));
        errorMessage = errors
          .map((e: any) => e.message)
          .join(", ");
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  validateWebhook: (payload) => {
    // SendGrid webhook validation
    // You can add signature verification here if needed
    return true;
  },

  processInbound: async (payload) => {
    // Process inbound email webhook from SendGrid
    // SendGrid Inbound Parse Webhook format
    return {
      from: payload.from || payload.email,
      content: payload.text || payload.html || "",
      externalId: payload.msg_id || "unknown",
      attachments: payload.attachments || [],
    };
  },
};

/**
 * Send a test email to verify configuration
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    const result = await emailIntegration.send({
      to,
      content: "Test Email\n\nThis is a test email from your Unified Outreach Platform. If you received this, your SendGrid integration is working correctly!",
    });
    return result.success;
  } catch (error) {
    console.error("Test email failed:", error);
    return false;
  }
}
