import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { createContactSchema, updateContactSchema } from "@/lib/validations";
import { formatPhoneNumber } from "@/lib/utils";

export async function GET(req: Request) {
  // Require VIEW_CONTACTS permission (ADMIN, EDITOR, VIEWER)
  const auth = await requirePermission("VIEW_CONTACTS");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    const where: any = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }
    
    if (status) {
      where.status = status;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: { messages: true, notes: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json({
      contacts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  // Require CREATE_CONTACTS permission (ADMIN, EDITOR)
  const auth = await requirePermission("CREATE_CONTACTS");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const validated = createContactSchema.parse(body);

    // Clean up empty strings and format phone numbers
    const data: any = { ...validated };
    
    // Remove empty string fields
    Object.keys(data).forEach(key => {
      if (data[key] === "" || data[key] === null || data[key] === undefined) {
        delete data[key];
      }
    });
    
    // Format phone numbers if they exist
    if (data.phone) data.phone = formatPhoneNumber(data.phone);
    if (data.whatsapp) data.whatsapp = formatPhoneNumber(data.whatsapp);

    // Check for duplicates
    const existing = await prisma.contact.findFirst({
      where: {
        OR: [
          data.email ? { email: data.email } : null,
          data.phone ? { phone: data.phone } : null,
        ].filter(Boolean) as any[],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Contact with this email or phone already exists" },
        { status: 400 }
      );
    }

    const contact = await prisma.contact.create({
      data,
      include: {
        messages: true,
        notes: true,
      },
    });

    // Track analytics
    await prisma.analytics.create({
      data: {
        contactId: contact.id,
        channel: "SMS", // default
        eventType: "contact_created",
        eventData: { contactId: contact.id },
      },
    });

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    console.error("Create contact error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create contact" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  // Require EDIT_CONTACTS permission (ADMIN, EDITOR)
  const auth = await requirePermission("EDIT_CONTACTS");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validated = updateContactSchema.parse(body);

    // Clean up empty strings and format phone numbers
    const data: any = { ...validated };
    
    // Remove empty string fields
    Object.keys(data).forEach(key => {
      if (data[key] === "" || data[key] === null || data[key] === undefined) {
        delete data[key];
      }
    });
    
    // Format phone numbers if they exist
    if (data.phone) data.phone = formatPhoneNumber(data.phone);
    if (data.whatsapp) data.whatsapp = formatPhoneNumber(data.whatsapp);

    const contact = await prisma.contact.update({
      where: { id },
      data,
      include: {
        messages: true,
        notes: true,
      },
    });

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    console.error("Update contact error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  // Require DELETE_CONTACTS permission (ADMIN only)
  const auth = await requirePermission("DELETE_CONTACTS");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    // Delete contact (messages and notes will cascade)
    await prisma.contact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete contact error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete contact" },
      { status: 500 }
    );
  }
}
