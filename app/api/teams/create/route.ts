import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  slug: z
    .string()
    .min(3, "Team ID must be at least 3 characters")
    .max(50, "Team ID must be less than 50 characters")
    .regex(/^[a-z0-9-]+$/, "Team ID can only contain lowercase letters, numbers, and hyphens"),
  passwordAdmin: z.string().min(8, "Admin password must be at least 8 characters"),
  passwordEditor: z.string().min(8, "Editor password must be at least 8 characters"),
  passwordViewer: z.string().min(8, "Viewer password must be at least 8 characters"),
  description: z.string().optional(),
});

// POST - Create new team (for GUEST users)
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

    // Only GUEST users or ADMIN can create teams
    if (user.role !== "GUEST" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only GUEST users can create new teams" },
        { status: 403 }
      );
    }

    // GUEST users can only create one team
    if (user.role === "GUEST" && user.teamMembers.length > 0) {
      return NextResponse.json(
        { error: "You are already in a team. Please leave your current team to create a new one." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validated = createTeamSchema.parse(body);

    // Validate that all 3 passwords are unique
    if (validated.passwordAdmin === validated.passwordEditor || 
        validated.passwordAdmin === validated.passwordViewer || 
        validated.passwordEditor === validated.passwordViewer) {
      return NextResponse.json(
        { error: "All three passwords must be unique. Please use different passwords for Admin, Editor, and Viewer roles." },
        { status: 400 }
      );
    }

    // Check if slug is already taken
    const existingTeam = await prisma.team.findUnique({
      where: { slug: validated.slug },
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: "This Team ID is already taken. Please choose another one." },
        { status: 400 }
      );
    }

    // Hash the team passwords
    const hashedPasswordAdmin = await bcrypt.hash(validated.passwordAdmin, 10);
    const hashedPasswordEditor = await bcrypt.hash(validated.passwordEditor, 10);
    const hashedPasswordViewer = await bcrypt.hash(validated.passwordViewer, 10);

    // Create team with user as ADMIN
    const team = await prisma.team.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        passwordAdmin: hashedPasswordAdmin,
        passwordEditor: hashedPasswordEditor,
        passwordViewer: hashedPasswordViewer,
        members: {
          create: {
            userId: session.userId,
            role: "ADMIN",
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

    // Upgrade user from GUEST to ADMIN
    if (user.role === "GUEST") {
      await prisma.user.update({
        where: { id: session.userId },
        data: { role: "ADMIN" },
      });
    }

    console.log(`✅ Team created: ${team.name} (${team.slug}) by user ${session.userId}`);

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        members: team.members,
      },
      message: "Team created successfully! You are now the team admin.",
    });
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
