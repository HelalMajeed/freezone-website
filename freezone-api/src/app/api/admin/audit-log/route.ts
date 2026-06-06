import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { jsonOk } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { parsePagination } from "@/lib/admin-orders-query";
import { buildAuditWhere, mapAuditRow } from "@/lib/admin-audit-query";

/**
 * GET /api/admin/audit-log — filterable audit log (contract (g)).
 *
 * Query: `page`, `pageSize` (default 50, max 200), `entity`, `entityId`,
 * `user` (userEmail contains case-insensitive, or exact userId when numeric),
 * `action` (exact), `from`/`to` (on createdAt). `rows` (alias of `items`) and
 * `nextCursor` are retained but **deprecated** — new consumers use
 * `items` + pages.
 */
export async function GET(req: Request) {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return jsonOk({
      items: [],
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 1,
      rows: [],
      nextCursor: null,
    });
  }
  try {
    const { searchParams } = new URL(req.url);
    /** Back-compat: the legacy endpoint took `limit` — honor it as pageSize when no pageSize given. */
    const legacyLimit = parseInt(searchParams.get("limit") ?? "", 10);
    const defaultPageSize =
      !searchParams.get("pageSize") && Number.isFinite(legacyLimit) && legacyLimit >= 1
        ? Math.min(legacyLimit, 200)
        : 50;
    const { page, pageSize } = parsePagination(searchParams, {
      defaultPageSize,
      maxPageSize: 200,
    });
    const where = buildAuditWhere(searchParams);

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const items = rows.map(mapAuditRow);
    return jsonOk({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      /** Deprecated mirrors of `items` / cursor-style paging. */
      rows: items,
      nextCursor: null,
    });
  } catch (e) {
    try {
      return handleRouteDbError(e);
    } catch {
      return Response.json(
        { ok: false, error: "تعذّر تحميل سجل النشاط", code: "AUDIT_LOAD_FAILED" },
        { status: 500 },
      );
    }
  }
}
