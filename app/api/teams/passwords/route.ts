import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = 'force-dynamic';

// GET - Get team passwords (ADMIN only) - Returns placeholder since passwords are hashed
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Check if user is admin of the team
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: session.userId,
          teamId,
        },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            passwordAdmin: true,
            passwordEditor: true,
            passwordViewer: true,
          },
        },
      },
    });

    if (!teamMember || teamMember.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only team admins can view team passwords" },
        { status: 403 }
      );
    }

    // Return info about which passwords are set (not the actual hashes)
    return NextResponse.json({
      hasAdminPassword: !!teamMember.team.passwordAdmin,
      hasEditorPassword: !!teamMember.team.passwordEditor,
      hasViewerPassword: !!teamMember.team.passwordViewer,
      message: "Passwords are hashed and cannot be retrieved. You can only reset them.",
    });
  } catch (error) {
    console.error("Error fetching team passwords:", error);
    return NextResponse.json(
      { error: "Failed to fetch team passwords" },
      { status: 500 }
    );
  }
}
