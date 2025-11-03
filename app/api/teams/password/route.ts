import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { z } from "zod";

const resetPasswordSchema = z.object({
  teamId: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  passwordType: z.enum(["admin", "editor", "viewer"]),
}).refine(
  (data) => {
    // We'll validate uniqueness on the server side by checking other passwords
    return true;
  },
  {
    message: "Passwords must be unique",
  }
);

// POST - Reset team password (ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = resetPasswordSchema.parse(body);

    // Check if user is admin of the team
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: session.userId,
          teamId: validated.teamId,
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
        { error: "Only team admins can reset team password" },
        { status: 403 }
      );
    }

    // Validate that the new password is different from the other two passwords
    const currentPasswords: { [key: string]: string | null } = {
      admin: teamMember.team.passwordAdmin,
      editor: teamMember.team.passwordEditor,
      viewer: teamMember.team.passwordViewer,
    };

    // Check if the new password matches any of the OTHER role passwords
    for (const [role, hashedPassword] of Object.entries(currentPasswords)) {
      if (role !== validated.passwordType && hashedPassword) {
        const matches = await bcrypt.compare(validated.newPassword, hashedPassword);
        if (matches) {
          return NextResponse.json(
            { error: `This password is already used for ${role} role. Please use a unique password for each role.` },
            { status: 400 }
          );
        }
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validated.newPassword, 10);

    // Update the appropriate password field
    const updateData: any = {};
    if (validated.passwordType === "admin") {
      updateData.passwordAdmin = hashedPassword;
    } else if (validated.passwordType === "editor") {
      updateData.passwordEditor = hashedPassword;
    } else if (validated.passwordType === "viewer") {
      updateData.passwordViewer = hashedPassword;
    }

    // Update team password
    await prisma.team.update({
      where: { id: validated.teamId },
      data: updateData,
    });

    console.log(`✅ Team ${validated.passwordType} password reset for team ${teamMember.team.name} by ${session.userId}`);
    console.log(`🔑 New ${validated.passwordType} password: ${validated.newPassword}`);

    return NextResponse.json({
      success: true,
      message: "Team password reset successfully",
      password: validated.newPassword, // Return the plaintext password so admin can copy it
      passwordType: validated.passwordType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Error resetting team password:", error);
    return NextResponse.json(
      { error: "Failed to reset team password" },
      { status: 500 }
    );
  }
}
