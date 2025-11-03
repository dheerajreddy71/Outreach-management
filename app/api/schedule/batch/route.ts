import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import type { MessageChannel } from "@/types";

export async function POST(req: NextRequest) {
  // Require CREATE_SCHEDULED permission (ADMIN, EDITOR)
  const auth = await requirePermission("CREATE_SCHEDULED");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { contactIds, channel, content, scheduledAt } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "Contact IDs are required" }, { status: 400 });
    }

    if (!channel || !content || !scheduledAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create scheduled messages for all contacts
    const scheduledMessages = await Promise.all(
      contactIds.map(async (contactId) => {
        return prisma.scheduledMessage.create({
          data: {
            contactId,
            userId: auth.session.userId,
            channel: channel as MessageChannel,
            content,
            scheduledAt: new Date(scheduledAt),
            status: "PENDING",
          },
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      count: scheduledMessages.length,
      scheduled: scheduledMessages,
    });
  } catch (error) {
    console.error("Batch schedule error:", error);
    return NextResponse.json(
      { error: "Failed to batch schedule messages" },
      { status: 500 }
    );
  }
}
