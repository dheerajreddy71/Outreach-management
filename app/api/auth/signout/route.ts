import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/session";

export async function POST() {
  try {
    // Delete session server-side (best-effort)
    try {
      await deleteSession();
    } catch (e) {
      // log but continue to ensure cookie cleared on response
      console.error('deleteSession error:', e);
    }

    // Return a response that explicitly clears the cookie on the client
    const res = NextResponse.json({ success: true });
    // Ensure cookie is removed in the response by setting an expired cookie
    res.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
      sameSite: "lax",
    });
    return res;
  } catch (error) {
    console.error("Sign out error:", error);
    return NextResponse.json(
      { error: "An error occurred during sign out" },
      { status: 500 }
    );
  }
}
