import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { requireSuperAdminRead } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { parsePagination } from "@/lib/admin-orders-query";
import { mapAuditRow } from "@/lib/admin-audit-query";

/**
 * GET /api/admin/audit-log/:entity/:entityId — per-entity history
 * (contract (g)). Same item shape as the list endpoint, ascending
 * `createdAt`, pageSize default 100 max 200.
 *
 * SUPER_ADMIN only (mission §4D) — drilled into exclusively from the
 * superadmin-gated audit viewer page.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ entity: string; entityId: string }> },
) {
  const g = await requireSuperAdminRead(req);
  if (!g.ok) return g.response;

  const { entity: rawEntity, entityId: rawEntityId } = await ctx.params;
  const entity = decodeURIComponent(rawEntity ?? "").trim();
  const entityId = decodeURIComponent(rawEntityId ?? "").trim();
  if (!entity || !entityId) return jsonError(400, "VALIDATION");

  if (!isDatabaseConfigured()) {
    return jsonOk({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 1 });
  }

  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams, {
    defaultPageSize: 100,
    maxPageSize: 200,
  });

  try {
    const where = { entity, entityId };
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return jsonOk({
      items: rows.map(mapAuditRow),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
