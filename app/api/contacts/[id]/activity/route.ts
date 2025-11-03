import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require VIEW_CONTACTS permission (ADMIN, EDITOR, VIEWER)
  const auth = await requirePermission("VIEW_CONTACTS");
  if (auth.error) return auth.error;

  try {
    const contactId = params.id;

    // Verify contact exists
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Fetch all activities for this contact
    const [messages, notes] = await Promise.all([
      // Messages
      prisma.message.findMany({
        where: { contactId },
        select: {
          id: true,
          content: true,
          channel: true,
          direction: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      // Notes
      prisma.note.findMany({
        where: { contactId },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    // Combine and format all activities
    const activities = [
      ...messages.map((msg: any) => ({
        type: "message",
        id: msg.id,
        content: msg.content,
        channel: msg.channel,
        direction: msg.direction,
        status: msg.status,
        createdAt: msg.createdAt,
        user: msg.user,
      })),
      ...notes.map((note: any) => ({
        type: "note",
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        user: note.user,
      })),
    ];

    // Sort by date descending
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Error fetching contact activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
