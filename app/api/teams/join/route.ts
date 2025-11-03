import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";
import bcrypt from "bcryptjs";

const joinTeamSchema = z.object({
  slug: z.string().min(3, "Team ID is required"),
  password: z.string().min(1, "Team password is required"),
});

// POST - Join existing team (for GUEST users)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, teamMembers: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only GUEST users can join teams this way
    if (user.role !== "GUEST" as any) {
      return NextResponse.json(
        { error: "Only GUEST users can join teams" },
        { status: 403 }
      );
    }

    // GUEST users can only join one team
    if (user.teamMembers.length > 0) {
      return NextResponse.json(
        { error: "You are already in a team" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validated = joinTeamSchema.parse(body);

    // Find team by slug
    const team = await prisma.team.findUnique({
      where: { slug: validated.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        passwordAdmin: true,
        passwordEditor: true,
        passwordViewer: true,
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

    if (!team) {
      return NextResponse.json(
        { error: "Team not found. Please check the Team ID." },
        { status: 404 }
      );
    }

    console.log(`🔍 Team found: ${team.name}, checking passwords...`);
    console.log(`  - Admin password set: ${!!team.passwordAdmin}`);
    console.log(`  - Editor password set: ${!!team.passwordEditor}`);
    console.log(`  - Viewer password set: ${!!team.passwordViewer}`);
    console.log(`  - Input password length: ${validated.password.length}`);

    // Verify team password and determine role
    let assignedRole: "ADMIN" | "EDITOR" | "VIEWER" | null = null;

    if (!team.passwordAdmin && !team.passwordEditor && !team.passwordViewer) {
      return NextResponse.json(
        { error: "This team does not have passwords set. Please contact the team admin." },
        { status: 400 }
      );
    }

    // Check which password matches to determine role
    if (team.passwordAdmin && await bcrypt.compare(validated.password, team.passwordAdmin)) {
      assignedRole = "ADMIN";
      console.log(`✅ Password matched ADMIN role`);
    } else if (team.passwordEditor && await bcrypt.compare(validated.password, team.passwordEditor)) {
      assignedRole = "EDITOR";
      console.log(`✅ Password matched EDITOR role`);
    } else if (team.passwordViewer && await bcrypt.compare(validated.password, team.passwordViewer)) {
      assignedRole = "VIEWER";
      console.log(`✅ Password matched VIEWER role`);
    } else {
      console.log(`❌ Password did not match any of the 3 team passwords`);
    }

    if (!assignedRole) {
      return NextResponse.json(
        { error: "Incorrect team password" },
        { status: 401 }
      );
    }

    // Add user to team
    await prisma.teamMember.create({
      data: {
        userId: session.userId,
        teamId: team.id,
        role: assignedRole as any,
      },
    });

    // Upgrade user from GUEST to assigned role
    await prisma.user.update({
      where: { id: session.userId },
      data: { role: assignedRole as any },
    });

    console.log(`✅ User ${session.userId} joined team ${team.name} (${team.slug}) as ${assignedRole}`);

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        memberCount: team.members.length + 1,
      },
      role: assignedRole,
      message: `Successfully joined ${team.name} as ${assignedRole}!`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Error joining team:", error);
    return NextResponse.json(
      { error: "Failed to join team" },
      { status: 500 }
    );
  }
}
