import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createContactSchema } from "@/lib/validations";

interface CSVRow {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  jobTitle?: string;
  [key: string]: any;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contacts } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "No contacts provided" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string; data: any }>,
    };

    for (let i = 0; i < contacts.length; i++) {
      const contactData = contacts[i];

      try {
        // Validate contact data
        const validated = createContactSchema.parse(contactData);

        // Check for duplicates
        const existing = await prisma.contact.findFirst({
          where: {
            OR: [
              validated.email ? { email: validated.email } : {},
              validated.phone ? { phone: validated.phone } : {},
            ].filter((obj) => Object.keys(obj).length > 0),
          },
        });

        if (existing) {
          results.errors.push({
            row: i + 1,
            error: "Duplicate contact found",
            data: contactData,
          });
          results.failed++;
          continue;
        }

        // Create contact
        await prisma.contact.create({
          data: {
            firstName: validated.firstName,
            lastName: validated.lastName,
            email: validated.email,
            phone: validated.phone,
            whatsapp: validated.whatsapp,
            company: validated.company,
            jobTitle: validated.jobTitle,
            tags: validated.tags || [],
            customFields: validated.customFields || {},
          },
        });

        // Log analytics event
        await prisma.analytics.create({
          data: {
            eventType: "contact_imported",
            channel: "SMS",
            eventData: { source: "csv_import" },
          },
        });

        results.success++;
      } catch (error: any) {
        results.errors.push({
          row: i + 1,
          error: error.message || "Invalid contact data",
          data: contactData,
        });
        results.failed++;
      }
    }

    return NextResponse.json({
      message: `Import complete: ${results.success} succeeded, ${results.failed} failed`,
      results,
    });
  } catch (error: any) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
