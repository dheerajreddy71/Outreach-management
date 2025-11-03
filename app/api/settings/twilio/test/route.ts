import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import twilio from "twilio";

/**
 * Test Twilio Connection
 * Verifies Twilio credentials and configuration
 */
export async function POST() {
  // Require EDIT_INTEGRATIONS permission (ADMIN only)
  const auth = await requirePermission("EDIT_INTEGRATIONS");
  if (auth.error) return auth.error;

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        message: "Twilio credentials not configured in environment variables",
      });
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Test 1: Fetch account details
    const account = await client.api.v2010.accounts(accountSid).fetch();
    
    if (account.status !== "active") {
      return NextResponse.json({
        success: false,
        message: `Twilio account status: ${account.status}. Please activate your account.`,
      });
    }

    // Test 2: Check if phone number exists (if configured)
    let phoneNumberStatus = "Not configured";
    if (phoneNumber) {
      try {
        const number = await client.incomingPhoneNumbers.list({ phoneNumber, limit: 1 });
        if (number.length > 0) {
          phoneNumberStatus = "Active";
        } else {
          phoneNumberStatus = "Number not found in account";
        }
      } catch (error) {
        phoneNumberStatus = "Unable to verify phone number";
      }
    }

    return NextResponse.json({
      success: true,
      message: `✓ Connected to Twilio successfully!\n\nAccount: ${account.friendlyName}\nStatus: ${account.status}\nPhone Number: ${phoneNumberStatus}`,
      details: {
        accountSid: account.sid,
        accountName: account.friendlyName,
        accountStatus: account.status,
        phoneNumber: phoneNumber || "Not configured",
        phoneNumberStatus,
      },
    });
  } catch (error: any) {
    console.error("Twilio connection test failed:", error);
    
    return NextResponse.json({
      success: false,
      message: `✗ Connection failed: ${error.message || "Unknown error"}`,
      error: error.message,
    });
  }
}
