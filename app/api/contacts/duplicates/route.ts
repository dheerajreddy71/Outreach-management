import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { findDuplicateContacts } from "@/lib/duplicate-detection";

export async function POST(req: Request) {
  // Require CREATE_CONTACTS permission (ADMIN, EDITOR)
  const auth = await requirePermission("CREATE_CONTACTS");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { firstName, lastName, email, phone } = body;

    // Get all existing contacts
    const existingContacts = await prisma.contact.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
      },
    });

    // Find duplicates
    const duplicates = findDuplicateContacts(
      { firstName, lastName, email, phone },
      existingContacts.map(c => ({
        id: c.id,
        firstName: c.firstName || undefined,
        lastName: c.lastName || undefined,
        email: c.email || undefined,
        phone: c.phone || undefined,
        company: c.company || undefined,
      }))
    );

    return NextResponse.json({ duplicates });
  } catch (error: any) {
    console.error("Duplicate detection error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Merge contacts endpoint
export async function PUT(req: Request) {
  // Require EDIT_CONTACTS permission (ADMIN, EDITOR)
  const auth = await requirePermission("EDIT_CONTACTS");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { primaryId, duplicateIds } = body;

    if (!primaryId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return NextResponse.json(
        { error: "Primary ID and duplicate IDs required" },
        { status: 400 }
      );
    }

    // Get primary contact
    const primaryContact = await prisma.contact.findUnique({
      where: { id: primaryId },
    });

    if (!primaryContact) {
      return NextResponse.json({ error: "Primary contact not found" }, { status: 404 });
    }

    // Get duplicate contacts
    const duplicateContacts = await prisma.contact.findMany({
      where: { id: { in: duplicateIds } },
    });

    // Merge logic: Update all related records to point to primary contact
    for (const duplicate of duplicateContacts) {
      // Transfer messages
      await prisma.message.updateMany({
        where: { contactId: duplicate.id },
        data: { contactId: primaryId },
      });

      // Transfer notes
      await prisma.note.updateMany({
        where: { contactId: duplicate.id },
        data: { contactId: primaryId },
      });

      // Transfer scheduled messages
      await prisma.scheduledMessage.updateMany({
        where: { contactId: duplicate.id },
        data: { contactId: primaryId },
      });

      // Transfer analytics
      await prisma.analytics.updateMany({
        where: { contactId: duplicate.id },
        data: { contactId: primaryId },
      });

      // Merge tags (combine unique tags)
      const combinedTags = Array.from(
        new Set([...(primaryContact.tags || []), ...(duplicate.tags || [])])
      );

      // Merge custom fields (keep both, duplicate fields from primary take precedence)
      const mergedCustomFields = {
        ...(duplicate.customFields as object || {}),
        ...(primaryContact.customFields as object || {}),
      };

      // Update primary contact with merged data
      await prisma.contact.update({
        where: { id: primaryId },
        data: {
          tags: combinedTags,
          customFields: mergedCustomFields,
          // Fill in missing fields from duplicate if primary is empty
          firstName: primaryContact.firstName || duplicate.firstName,
          lastName: primaryContact.lastName || duplicate.lastName,
          email: primaryContact.email || duplicate.email,
          phone: primaryContact.phone || duplicate.phone,
          whatsapp: primaryContact.whatsapp || duplicate.whatsapp,
          company: primaryContact.company || duplicate.company,
          jobTitle: primaryContact.jobTitle || duplicate.jobTitle,
        },
      });

      // Delete the duplicate contact
      await prisma.contact.delete({
        where: { id: duplicate.id },
      });
    }

    // Get updated primary contact
    const updatedContact = await prisma.contact.findUnique({
      where: { id: primaryId },
      include: {
        _count: {
          select: {
            messages: true,
            notes: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Merged ${duplicateIds.length} duplicate(s) into primary contact`,
      contact: updatedContact,
    });
  } catch (error: any) {
    console.error("Merge contacts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
