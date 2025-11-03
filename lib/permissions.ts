import { NextResponse } from "next/server";
import { getSession } from "./session";
import { prisma } from "./prisma";

export type UserRole = "GUEST" | "VIEWER" | "EDITOR" | "ADMIN";

export interface SessionWithRole {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Permission definitions for role-based access control
 * GUEST has no access to data - only team management
 */
export const PERMISSIONS = {
  // Contact permissions
  VIEW_CONTACTS: ["ADMIN", "EDITOR", "VIEWER"],
  CREATE_CONTACTS: ["ADMIN", "EDITOR"],
  EDIT_CONTACTS: ["ADMIN", "EDITOR"],
  DELETE_CONTACTS: ["ADMIN"],
  IMPORT_CONTACTS: ["ADMIN", "EDITOR"],
  EXPORT_CONTACTS: ["ADMIN", "EDITOR"],

  // Message permissions
  VIEW_MESSAGES: ["ADMIN", "EDITOR", "VIEWER"],
  SEND_MESSAGES: ["ADMIN", "EDITOR"],
  DELETE_MESSAGES: ["ADMIN"],

  // Note permissions
  VIEW_NOTES: ["ADMIN", "EDITOR", "VIEWER"],
  CREATE_NOTES: ["ADMIN", "EDITOR"],
  EDIT_OWN_NOTES: ["ADMIN", "EDITOR"],
  EDIT_ALL_NOTES: ["ADMIN"],
  DELETE_OWN_NOTES: ["ADMIN", "EDITOR"],
  DELETE_ALL_NOTES: ["ADMIN"],

  // Template permissions
  VIEW_TEMPLATES: ["ADMIN", "EDITOR", "VIEWER"],
  CREATE_TEMPLATES: ["ADMIN", "EDITOR"],
  EDIT_TEMPLATES: ["ADMIN", "EDITOR"],
  DELETE_TEMPLATES: ["ADMIN"],

  // Schedule permissions
  VIEW_SCHEDULED: ["ADMIN", "EDITOR", "VIEWER"],
  CREATE_SCHEDULED: ["ADMIN", "EDITOR"],
  EDIT_SCHEDULED: ["ADMIN", "EDITOR"],
  DELETE_SCHEDULED: ["ADMIN", "EDITOR"],

  // Team permissions
  VIEW_TEAM: ["ADMIN", "EDITOR", "VIEWER"],
  INVITE_MEMBERS: ["ADMIN"],
  MANAGE_MEMBERS: ["ADMIN"],
  CHANGE_ROLES: ["ADMIN"],
  REMOVE_MEMBERS: ["ADMIN"],

  // Settings permissions
  VIEW_SETTINGS: ["ADMIN", "EDITOR", "VIEWER"],
  EDIT_INTEGRATIONS: ["ADMIN"],
  VIEW_ANALYTICS: ["ADMIN", "EDITOR"],
  EXPORT_DATA: ["ADMIN"],
} as const;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

/**
 * Get the current session with user role
 * Calculates effective role from team memberships (highest role wins)
 * @returns Session with role or null if not authenticated
 */
export async function getSessionWithRole(): Promise<SessionWithRole | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { 
      role: true,
      teamMembers: {
        select: {
          role: true,
        },
      },
    },
  });

  if (!user) return null;

  // Determine effective role: highest role from team memberships or base role
  let effectiveRole = user.role as UserRole;
  const roleHierarchy: Record<UserRole, number> = { 
    GUEST: 0, 
    VIEWER: 1, 
    EDITOR: 2, 
    ADMIN: 3 
  };
  
  for (const membership of user.teamMembers) {
    const teamRole = membership.role as UserRole;
    if (roleHierarchy[teamRole] > roleHierarchy[effectiveRole]) {
      effectiveRole = teamRole;
    }
  }

  return {
    ...session,
    role: effectiveRole,
  };
}

/**
 * Middleware to require authentication
 * Returns 401 if not authenticated
 */
export async function requireAuth() {
  const sessionWithRole = await getSessionWithRole();
  
  if (!sessionWithRole) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  return {
    error: null,
    session: sessionWithRole,
  };
}

/**
 * Middleware to require specific role(s)
 * Returns 401 if not authenticated, 403 if insufficient permissions
 */
export async function requireRole(...allowedRoles: UserRole[]) {
  const auth = await requireAuth();
  
  if (auth.error) {
    return auth;
  }

  if (!allowedRoles.includes(auth.session!.role)) {
    return {
      error: NextResponse.json(
        { 
          error: "Insufficient permissions",
          required: allowedRoles,
          current: auth.session!.role,
        },
        { status: 403 }
      ),
      session: null,
    };
  }

  return auth;
}

/**
 * Middleware to require specific permission
 * Returns 401 if not authenticated, 403 if permission denied
 */
export async function requirePermission(permission: keyof typeof PERMISSIONS) {
  const auth = await requireAuth();
  
  if (auth.error) {
    return auth;
  }

  if (!hasPermission(auth.session!.role, permission)) {
    return {
      error: NextResponse.json(
        { 
          error: "Permission denied",
          required: permission,
          allowedRoles: PERMISSIONS[permission],
          currentRole: auth.session!.role,
        },
        { status: 403 }
      ),
      session: null,
    };
  }

  return auth;
}

/**
 * Check if user owns a resource
 */
export async function isResourceOwner(userId: string, resourceOwnerId: string): Promise<boolean> {
  return userId === resourceOwnerId;
}

/**
 * Check if user can edit a note (owns it or is admin)
 */
export async function canEditNote(userId: string, userRole: UserRole, noteId: string): Promise<boolean> {
  if (userRole === "ADMIN") return true;

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { userId: true },
  });

  return note ? note.userId === userId : false;
}

/**
 * Check if user can delete a note (owns it or is admin)
 */
export async function canDeleteNote(userId: string, userRole: UserRole, noteId: string): Promise<boolean> {
  if (userRole === "ADMIN") return true;

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { userId: true },
  });

  return note ? note.userId === userId : false;
}
