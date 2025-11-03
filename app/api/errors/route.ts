import { NextResponse } from "next/server";
import { requirePermission, requireRole } from "@/lib/permissions";
import {
  getErrorLogs,
  getErrorStats,
  resolveError,
  ErrorSeverity,
} from "@/lib/error-logger";

/**
 * GET /api/errors - Get error logs
 * Query params:
 *  - severity: LOW | MEDIUM | HIGH | CRITICAL (optional)
 *  - category: string (optional)
 *  - resolvedOnly: boolean (optional)
 *  - limit: number (default: 100)
 */
export async function GET(req: Request) {
  // Require ADMIN role only for error logs
  const auth = await requireRole("ADMIN");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const severity = searchParams.get("severity") as ErrorSeverity | null;
    const category = searchParams.get("category");
    const resolvedOnly = searchParams.get("resolvedOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");
    const stats = searchParams.get("stats") === "true";

    if (stats) {
      const errorStats = getErrorStats();
      return NextResponse.json(errorStats);
    }

    const filters: any = { limit };
    if (severity) filters.severity = severity;
    if (category) filters.category = category;
    if (resolvedOnly) filters.resolvedOnly = resolvedOnly;

    const logs = getErrorLogs(filters);

    return NextResponse.json({
      errors: logs,
      total: logs.length,
    });
  } catch (error) {
    console.error("Get errors endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to fetch error logs" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/errors/:id - Mark error as resolved
 */
export async function PATCH(req: Request) {
  // Require ADMIN role only
  const auth = await requireRole("ADMIN");
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { errorId } = body;

    if (!errorId) {
      return NextResponse.json(
        { error: "errorId is required" },
        { status: 400 }
      );
    }

    const success = resolveError(errorId);

    if (success) {
      return NextResponse.json({ success: true, message: "Error marked as resolved" });
    } else {
      return NextResponse.json(
        { error: "Error not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Resolve error endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to resolve error" },
      { status: 500 }
    );
  }
}
