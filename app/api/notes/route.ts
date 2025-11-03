import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { createNoteSchema } from "@/lib/validations";
import { extractMentions } from "@/lib/utils";
import { getSocketServer } from "@/lib/socket";

export async function GET(req: Request) {
  // Require VIEW_NOTES permission (ADMIN, EDITOR, VIEWER)
  const auth = await requirePermission("VIEW_NOTES");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    const userId = auth.session!.userId;

    // Fetch user's team IDs for TEAM visibility filtering
    const userTeams = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIds = userTeams.map(tm => tm.teamId);

    // Build visibility filter
    const visibilityFilter = {
      OR: [
        { visibility: "PUBLIC" as const }, // Everyone can see PUBLIC notes
        { userId: userId }, // User can see their own PRIVATE notes
        // User can see TEAM notes if they share a team with the note creator
        {
          AND: [
            { visibility: "TEAM" as const },
            {
              user: {
                teamMembers: {
                  some: {
                    teamId: { in: teamIds },
                  },
                },
              },
            },
          ],
        },
      ],
    };

    const notes = await prisma.note.findMany({
      where: { 
        contactId,
        ...visibilityFilter,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: {
          where: visibilityFilter, // Also filter replies by visibility
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Get notes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  // Require CREATE_NOTES permission (ADMIN, EDITOR)
  const auth = await requirePermission("CREATE_NOTES");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const validated = createNoteSchema.parse(body);

    // Use authenticated user ID
    const userId = auth.session!.userId;

    // Extract mentions from content
    const mentions = extractMentions(validated.content);

    const note = await prisma.note.create({
      data: {
        contactId: validated.contactId,
        userId: userId,
        content: validated.content,
        visibility: validated.visibility,
        mentions: mentions,
        parentId: validated.parentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Send @mention notifications
    if (mentions.length > 0) {
      // Find users by email from mentions
      const mentionedUsers = await prisma.user.findMany({
        where: {
          email: { in: mentions },
        },
        select: { id: true, email: true, name: true },
      });

      // Create notifications for mentioned users
      const notifications = mentionedUsers
        .filter((user) => user.id !== userId) // Don't notify yourself
        .map((user) => ({
          userId: user.id,
          type: "MENTION" as const,
          title: `${auth.session!.email} mentioned you in a note`,
          message: validated.content.substring(0, 200), // First 200 chars
          link: `/inbox?contactId=${validated.contactId}&tab=notes&noteId=${note.id}`,
          metadata: {
            noteId: note.id,
            contactId: validated.contactId,
            mentionedBy: userId,
          },
        }));

      if (notifications.length > 0) {
        await prisma.notification.createMany({
          data: notifications,
        });

        // Send real-time notifications via WebSocket
        const io = getSocketServer();
        if (io) {
          mentionedUsers.forEach((user) => {
            io.to(`user:${user.id}`).emit("notification:new", {
              type: "MENTION",
              title: `${auth.session!.email} mentioned you in a note`,
              message: validated.content.substring(0, 200),
              link: `/inbox?contactId=${validated.contactId}&tab=notes&noteId=${note.id}`,
            });
          });
        }
      }
    }

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    console.error("Create note error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create note" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const note = await prisma.note.update({
      where: { id },
      data: {
        content: body.content,
        visibility: body.visibility,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    console.error("Update note error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update note" },
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
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    await prisma.note.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete note error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete note" },
      { status: 500 }
    );
  }
}
