import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleMessageSchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");
    const status = searchParams.get("status");

    const where: any = {};
    if (contactId) where.contactId = contactId;
    if (status) where.status = status;

    const scheduled = await prisma.scheduledMessage.findMany({
      where,
      include: {
        contact: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        template: true,
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({ scheduled });
  } catch (error) {
    console.error("Get scheduled messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = scheduleMessageSchema.parse(body);

    // Get userId from body or find first user as fallback
    let userId = body.userId;
    
    if (!userId) {
      const firstUser = await prisma.user.findFirst({
        select: { id: true }
      });
      
      if (!firstUser) {
        return NextResponse.json(
          { error: "No user found. Please create a user account first." },
          { status: 400 }
        );
      }
      
      userId = firstUser.id;
    }

    const scheduledMessage = await prisma.scheduledMessage.create({
      data: {
        contactId: validated.contactId,
        userId: userId,
        channel: validated.channel,
        content: validated.content,
        scheduledAt: new Date(validated.scheduledAt),
        templateId: validated.templateId,
        status: "PENDING",
      },
      include: {
        contact: true,
        user: true,
      },
    });

    return NextResponse.json({ success: true, scheduled: scheduledMessage });
  } catch (error: any) {
    console.error("Schedule message error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to schedule message" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Schedule ID is required" },
        { status: 400 }
      );
    }

    await prisma.scheduledMessage.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cancel scheduled message error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel scheduled message" },
      { status: 500 }
    );
  }
}
