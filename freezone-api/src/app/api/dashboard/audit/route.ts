import { prisma } from "@/lib/prisma";
import { requireSuperAdminRead } from "@/lib/admin-auth";
import { jsonOk } from "@/lib/dashboard-guard";

/**
 * GET /api/dashboard/audit?limit=50&cursor=...
 * Reverse chronological audit log entries.
 *
 * SUPER_ADMIN only (mission §4D): the audit log exposes every operator's
 * actions, IPs and user agents — lower dashboard roles get 403.
 */
export async function GET(req: Request): Promise<Response> {
  const g = await requireSuperAdminRead(req);
  if (!g.ok) return g.response;

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));
  const cursorRaw = url.searchParams.get("cursor");
  const cursorId = cursorRaw ? Number.parseInt(cursorRaw, 10) : null;

  const entries = await prisma.auditLog.findMany({
    take: limit + 1,
    orderBy: { id: "desc" },
    ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
  });

  const hasMore = entries.length > limit;
  const items = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return jsonOk({ items, nextCursor });
}
