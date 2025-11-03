import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  // Require VIEW_SETTINGS permission (ADMIN, EDITOR, VIEWER)
  const auth = await requirePermission("VIEW_SETTINGS");
  if (auth.error) return auth.error;

  try {
    const apiKey = process.env.SENDGRID_API_KEY || "";
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || "";
    const fromName = process.env.SENDGRID_FROM_NAME || "Unified Inbox";

    return NextResponse.json({
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : "",
      fromEmail,
      fromName,
      isConfigured: !!(apiKey && fromEmail),
    });
  } catch (error) {
    console.error("Error fetching SendGrid settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
