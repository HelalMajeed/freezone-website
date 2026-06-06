import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";

export async function GET(req: Request) {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const url = new URL(req.url);
  const sourceFilter = url.searchParams.get("source") || undefined;
  const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "20", 10) || 20));

  try {
    const batches = await prisma.importBatch.findMany({
      where: sourceFilter ? { source: sourceFilter } : undefined,
      orderBy: { startedAt: "desc" },
      take: limit,
      select: {
        id: true,
        source: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        total: true,
        succeeded: true,
        failed: true,
        lockOwner: true,
        notes: true,
      },
    });
    return Response.json({ batches });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
