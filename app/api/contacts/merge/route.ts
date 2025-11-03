import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { mergeContacts } from "@/lib/duplicate-detection";

/**
 * POST /api/contacts/merge - Merge two contacts
 * Body: {
 *   primaryContactId: string,
 *   secondaryContactId: string,
 *   mergeStrategy: { preferPrimary?: boolean, fields?: {...} }
 * }
 */
export async function POST(req: Request) {
  const auth = await requirePermission("EDIT_CONTACTS");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { primaryContactId, secondaryContactId, mergeStrategy } = body;

    if (!primaryContactId || !secondaryContactId) {
      return NextResponse.json(
        { error: "Both primaryContactId and secondaryContactId are required" },
        { status: 400 }
      );
    }

    if (primaryContactId === secondaryContactId) {
      return NextResponse.json(
        { error: "Cannot merge a contact with itself" },
        { status: 400 }
      );
    }

    const mergedContact = await mergeContacts(
      primaryContactId,
      secondaryContactId,
      mergeStrategy || { preferPrimary: true }
    );

    return NextResponse.json({
      success: true,
      contact: mergedContact,
      message: "Contacts merged successfully",
    });
  } catch (error: any) {
    console.error("Merge contacts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to merge contacts" },
      { status: 500 }
    );
  }
}
