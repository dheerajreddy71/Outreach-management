import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  // Require EXPORT_CONTACTS permission (ADMIN, EDITOR)
  const auth = await requirePermission("EXPORT_CONTACTS");
  if (auth.error) return auth.error;

  try {
    const contacts = await prisma.contact.findMany({
      include: {
        messages: {
          select: {
            id: true,
            channel: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        notes: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Generate CSV content
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "WhatsApp",
      "Company",
      "Job Title",
      "Status",
      "Tags",
      "Last Contacted",
      "Total Messages",
      "Total Notes",
      "Created At",
    ];

    const rows = contacts.map((contact) => [
      contact.firstName || "",
      contact.lastName || "",
      contact.email || "",
      contact.phone || "",
      contact.whatsapp || "",
      contact.company || "",
      contact.jobTitle || "",
      contact.status,
      (contact.tags || []).join("; "),
      contact.lastContactedAt
        ? new Date(contact.lastContactedAt).toISOString().split("T")[0]
        : "",
      contact.messages.length.toString(),
      contact.notes.length.toString(),
      new Date(contact.createdAt).toISOString().split("T")[0],
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="contacts-${
          new Date().toISOString().split("T")[0]
        }.csv"`,
      },
    });
  } catch (error) {
    console.error("Export contacts error:", error);
    return NextResponse.json(
      { error: "Failed to export contacts" },
      { status: 500 }
    );
  }
}
