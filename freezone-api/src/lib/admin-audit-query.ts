import type { AuditLog, Prisma } from "@prisma/client";
import { parseDateRangeParam } from "./admin-orders-query";

/** Shared filter parsing for /api/admin/audit-log (contract (g)). */
export function buildAuditWhere(searchParams: URLSearchParams): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  const entity = searchParams.get("entity")?.trim();
  if (entity) where.entity = entity;

  const entityId = searchParams.get("entityId")?.trim();
  if (entityId) where.entityId = entityId;

  const action = searchParams.get("action")?.trim();
  if (action) where.action = action;

  /** `user` = userEmail contains (case-insensitive), or exact userId when numeric. */
  const user = searchParams.get("user")?.trim();
  if (user) {
    if (/^\d+$/.test(user)) {
      where.OR = [
        { userId: parseInt(user, 10) },
        { userEmail: { contains: user, mode: "insensitive" } },
      ];
    } else {
      where.userEmail = { contains: user, mode: "insensitive" };
    }
  }

  const from = parseDateRangeParam(searchParams.get("from"), "from");
  const to = parseDateRangeParam(searchParams.get("to"), "to");
  if (from || to) {
    where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }

  return where;
}

/** Frozen item shape for audit-log endpoints. */
export function mapAuditRow(row: AuditLog) {
  return {
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    payload: row.payload ?? null,
    userId: row.userId,
    userEmail: row.userEmail,
    ip: row.ip,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
  };
}
