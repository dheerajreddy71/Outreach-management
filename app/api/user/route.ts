import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { changePasswordSchema } from "@/lib/validations";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user with team membership
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        teamMembers: {
          include: {
            team: {
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
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine effective role: highest role from team memberships or base role
    let effectiveRole = user.role;
    const roleHierarchy = { GUEST: 0, VIEWER: 1, EDITOR: 2, ADMIN: 3 };
    
    for (const membership of (user as any).teamMembers) {
      const teamRole = membership.role;
      if (roleHierarchy[teamRole as keyof typeof roleHierarchy] > roleHierarchy[effectiveRole as keyof typeof roleHierarchy]) {
        effectiveRole = teamRole;
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: effectiveRole, // Return highest role from team memberships
        baseRole: user.role, // Keep base role for reference
        createdAt: user.createdAt,
      },
      teamMemberships: (user as any).teamMembers.map((membership: any) => ({
        id: membership.id,
        role: membership.role,
        team: {
          id: membership.team.id,
          name: membership.team.name,
          slug: membership.team.slug,
          description: membership.team.description,
          members: (membership.team.members || []).map((member: any) => ({
            id: member.id,
            role: member.role,
            user: member.user,
            joinedAt: member.joinedAt,
          })),
        },
      })),
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, currentPassword, newPassword } = body;

    // If password change is requested
    if (currentPassword && newPassword) {
      // Validate password change input
      const validation = changePasswordSchema.safeParse({
        currentPassword,
        newPassword,
      });

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }

      // Fetch user with password
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { password: true },
      });

      if (!user?.password) {
        return NextResponse.json(
          { error: "User not found or no password set" },
          { status: 404 }
        );
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: session.userId },
        data: { password: hashedPassword },
      });

      return NextResponse.json({
        message: "Password updated successfully",
      });
    }

    // Update user profile (name only)
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: name || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
