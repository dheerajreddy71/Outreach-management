import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";

// POST - Accept invitation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, name, password } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Check if already accepted
    if (invitation.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Invitation has already been accepted" },
        { status: 400 }
      );
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    // If user doesn't exist, create new account
    if (!user) {
      if (!name || !password) {
        return NextResponse.json(
          { error: "Name and password are required for new users" },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      user = await prisma.user.create({
        data: {
          email: invitation.email,
          name,
          password: hashedPassword,
          role: invitation.role,
          emailVerified: true,
        },
      });
    }

    // If teamId provided, add user to team
    if (invitation.teamId) {
      // Check if already a member
      const existingMembership = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: user.id,
            teamId: invitation.teamId,
          },
        },
      });

      if (existingMembership) {
        // Update existing membership role
        await prisma.teamMember.update({
          where: {
            userId_teamId: {
              userId: user.id,
              teamId: invitation.teamId,
            },
          },
          data: {
            role: invitation.role,
          },
        });
      } else {
        // Create new membership
        await prisma.teamMember.create({
          data: {
            userId: user.id,
            teamId: invitation.teamId,
            role: invitation.role,
          },
        });
      }
    }
    
    // Always update user's platform-wide role if invitation role is higher OR if user is GUEST
    const roleHierarchy = { GUEST: -1, VIEWER: 0, EDITOR: 1, ADMIN: 2 };
    const currentRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || -1;
    const inviteRoleLevel = roleHierarchy[invitation.role as keyof typeof roleHierarchy] || 0;
    
    if (inviteRoleLevel > currentRoleLevel) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: invitation.role as any },
      });
      user.role = invitation.role; // Update local reference
      console.log(`✅ Upgraded user ${user.email} from ${Object.keys(roleHierarchy).find(k => roleHierarchy[k as keyof typeof roleHierarchy] === currentRoleLevel)} to ${invitation.role}`);
    }

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    // Create session for the user
    await createSession(user.id, user.email);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message: "Invitation accepted successfully",
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
