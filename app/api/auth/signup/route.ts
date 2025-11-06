import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Check if this is the first user (make them an admin)
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: (isFirstUser ? "ADMIN" : "GUEST") as any, // New users are GUEST by default
      },
    });

    // Create session for the new user
    await createSession(user.id, user.email);

    // New users (GUEST) without teams should go to onboarding
    const redirectTo = user.role === "GUEST" ? "/onboarding" : "/inbox";

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      redirectTo,
    });
  } catch (error) {
    console.error("Sign up error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      env: {
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      }
    });
    return NextResponse.json(
      { error: "An error occurred during sign up", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
