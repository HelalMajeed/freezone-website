import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import {
  computeCatalogHealthSummary,
  listDataQualityIssues,
} from "@/lib/admin-catalog-health";

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "invalid_filters";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));

  if (!isDatabaseConfigured()) {
    return Response.json({
      dbConnected: false,
      tab,
      page,
      limit,
      total: 0,
      items: [],
      summary: {},
    });
  }

  try {
    const [summary, list] = await Promise.all([
      computeCatalogHealthSummary(prisma),
      listDataQualityIssues(prisma, tab, page, limit),
    ]);
    return Response.json({
      dbConnected: true,
      tab,
      page,
      limit,
      total: list.total,
      items: list.items,
      summary,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to load data quality" },
      { status: 500 },
    );
  }
}
