import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import sgMail from "@sendgrid/mail";

/**
 * Test SendGrid Connection
 * Verifies SendGrid API key and configuration
 */
export async function POST() {
  // Require EDIT_INTEGRATIONS permission (ADMIN only)
  const auth = await requirePermission("EDIT_INTEGRATIONS");
  if (auth.error) return auth.error;

  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: "SendGrid API key not configured in environment variables",
      });
    }

    if (!fromEmail) {
      return NextResponse.json({
        success: false,
        message: "SendGrid from email not configured in environment variables",
      });
    }

    // Initialize SendGrid
    sgMail.setApiKey(apiKey);

    // Test: Send a test email to self (won't actually send, just validates)
    try {
      // Validate API key by making a request to SendGrid API
      const response = await fetch("https://api.sendgrid.com/v3/scopes", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.errors?.[0]?.message || "Invalid API key");
      }

      const data = await response.json();
      const scopes = data.scopes || [];

      // Check for mail.send permission
      const canSendMail = scopes.includes("mail.send");

      return NextResponse.json({
        success: true,
        message: `✓ Connected to SendGrid successfully!\n\nFrom Email: ${fromEmail}\nFrom Name: ${fromName || "Not set"}\nPermissions: ${canSendMail ? "Can send emails" : "Limited permissions"}`,
        details: {
          fromEmail,
          fromName: fromName || "Not configured",
          canSendMail,
          scopes: scopes.slice(0, 5), // Show first 5 scopes
        },
      });
    } catch (error: any) {
      throw new Error(`API key validation failed: ${error.message}`);
    }
  } catch (error: any) {
    console.error("SendGrid connection test failed:", error);
    
    return NextResponse.json({
      success: false,
      message: `✗ Connection failed: ${error.message || "Unknown error"}`,
      error: error.message,
    });
  }
}
