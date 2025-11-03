import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
});

const updateMemberSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

const updateTeamSchema = z.object({
  slug: z.string()
    .min(3, "Team ID must be at least 3 characters")
    .max(50, "Team ID must be less than 50 characters")
    .regex(/^[a-z0-9-]+$/, "Team ID can only contain lowercase letters, numbers, and hyphens"),
});

// GET - Fetch all teams for current user
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: session.userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

// POST - Create new team
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can create teams" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = createTeamSchema.parse(body);

    // Generate unique slug from name
    const baseSlug = validated.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);
    
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const slug = `${baseSlug}-${randomSuffix}`;

    const team = await prisma.team.create({
      data: {
        name: validated.name,
        slug: slug,
        description: validated.description,
        members: {
          create: {
            userId: session.userId,
            role: "ADMIN" as any,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating team:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}

// PATCH - Update team member role or team slug
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const body = await req.json();

    // Check if this is a team slug update
    if (body.teamId && body.slug) {
      const validated = updateTeamSchema.parse(body);

      // Check if user is admin of the team
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: session.userId,
            teamId: body.teamId,
          },
        },
      });

      if (!teamMember || teamMember.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only team admins can update team ID" },
          { status: 403 }
        );
      }

      // Check if slug is already taken
      const existingTeam = await prisma.team.findUnique({
        where: { slug: validated.slug },
      });

      if (existingTeam && existingTeam.id !== body.teamId) {
        return NextResponse.json(
          { error: "This Team ID is already taken" },
          { status: 400 }
        );
      }

      // Update team slug
      await prisma.team.update({
        where: { id: body.teamId },
        data: { slug: validated.slug },
      });

      return NextResponse.json({
        success: true,
        message: "Team ID updated successfully",
      });
    }

    // Otherwise, this is a member role update
    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    const validated = updateMemberSchema.parse(body);

    // Check if current user is admin of the team
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        team: {
          include: {
            members: {
              where: {
                userId: session.userId,
                role: "ADMIN",
              },
            },
          },
        },
      },
    });

    if (!member || member.team.members.length === 0) {
      return NextResponse.json(
        { error: "You don't have permission to update this member" },
        { status: 403 }
      );
    }

    const updatedMember = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role: validated.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

// DELETE - Remove team member
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Check if current user is admin of the team
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        team: {
          include: {
            members: {
              where: {
                userId: session.userId,
                role: "ADMIN",
              },
            },
          },
        },
      },
    });

    if (!member || member.team.members.length === 0) {
      return NextResponse.json(
        { error: "You don't have permission to remove this member" },
        { status: 403 }
      );
    }

    // Delete team membership
    await prisma.teamMember.delete({
      where: { id: memberId },
    });

    // Reset user's platform role to GUEST since they're no longer in any team
    await prisma.user.update({
      where: { id: member.userId },
      data: { role: "GUEST" as any },
    });

    console.log(`✅ Removed user ${member.userId} from team and reset role to GUEST`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
