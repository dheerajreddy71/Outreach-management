import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Use AUTH_SECRET (same as Better Auth) for session encryption
const secretKey = process.env.AUTH_SECRET || process.env.SESSION_SECRET || "your-secret-key-change-in-production";
const key = new TextEncoder().encode(secretKey);
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

export interface SessionData {
  userId: string;
  email: string;
  expiresAt: Date;
}

export async function encrypt(payload: SessionData): Promise<string> {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function decrypt(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionData;
  } catch (error) {
    console.error("Failed to decrypt session:", error);
    return null;
  }
}

export async function createSession(userId: string, email: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);
  const session: SessionData = { userId, email, expiresAt };
  const token = await encrypt(session);

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  console.log("[Session] Checking session, token exists:", !!token);

  if (!token) {
    return null;
  }

  const session = await decrypt(token);

  if (!session) {
    console.log("[Session] Token decryption failed");
    return null;
  }

  // Check if session has expired
  if (new Date() > new Date(session.expiresAt)) {
    console.log("[Session] Session expired");
    await deleteSession();
    return null;
  }

  console.log("[Session] Valid session for user:", session.userId);
  return session;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function updateSession(request: NextRequest) {
  const token = request.cookies.get("session")?.value;

  if (!token) {
    return null;
  }

  const session = await decrypt(token);

  if (!session) {
    return null;
  }

  // Refresh the session
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);
  session.expiresAt = expiresAt;

  const newToken = await encrypt(session);

  const response = NextResponse.next();
  response.cookies.set("session", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
