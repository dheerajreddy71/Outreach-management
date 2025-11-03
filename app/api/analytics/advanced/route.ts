import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import {
  getConversionFunnel,
  getLeadSources,
  getTeamPerformance,
  getContactEngagementScores,
  getChannelEffectiveness,
} from "@/lib/advanced-analytics";

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/advanced - Get advanced analytics metrics
 * Query params:
 *  - type: funnel | sources | team | engagement | channels
 *  - startDate: ISO date string (optional)
 *  - endDate: ISO date string (optional)
 */
export async function GET(req: Request) {
  // Require VIEW_ANALYTICS permission (ADMIN only)
  const auth = await requirePermission("VIEW_ANALYTICS");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "funnel";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let dateRange: { start: Date; end: Date } | undefined;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    let data: any;

    switch (type) {
      case "funnel":
        data = await getConversionFunnel(dateRange);
        break;

      case "sources":
        data = await getLeadSources();
        break;

      case "team":
        data = await getTeamPerformance(dateRange);
        break;

      case "engagement":
        const limit = parseInt(searchParams.get("limit") || "10");
        data = await getContactEngagementScores(limit);
        break;

      case "channels":
        data = await getChannelEffectiveness();
        break;

      default:
        return NextResponse.json(
          { error: "Invalid analytics type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ type, data });
  } catch (error) {
    console.error("Advanced analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch advanced analytics" },
      { status: 500 }
    );
  }
}
