import type { Prisma } from "@prisma/client";

/** Allowed order statuses — single source for list filters and transitions. */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * Forward-only order status state machine. `cancelled` is intentionally not a
 * target here — cancellation must go through POST /api/admin/orders/:id/cancel
 * so stock restore is explicit. Terminal states (`delivered`, `cancelled`) have
 * no outgoing transitions, so a cancelled/delivered order can never be reopened
 * via PATCH (which would double-count restored stock). A no-op (from === to) is
 * allowed so an idempotent re-set of the same status does not 409.
 */
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "processing", "shipped", "delivered"],
  confirmed: ["processing", "shipped", "delivered"],
  processing: ["shipped", "delivered"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** True when `to` is a legal next status from `from` (or a no-op same-status). */
export function isAllowedOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return ORDER_TRANSITIONS[from].includes(to);
}

/**
 * Parse a `from`/`to` date-range param per the API conventions:
 * accepts `YYYY-MM-DD` or full ISO; `from` normalizes to 00:00:00.000 UTC,
 * `to` normalizes to 23:59:59.999 UTC of that day. Invalid input → null.
 */
export function parseDateRangeParam(raw: string | null, edge: "from" | "to"): Date | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const isDayOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const parsed = new Date(isDayOnly ? `${trimmed}T00:00:00.000Z` : trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const d = new Date(parsed);
  if (edge === "from") d.setUTCHours(0, 0, 0, 0);
  else d.setUTCHours(23, 59, 59, 999);
  return d;
}

/** Standard pagination params: page ≥ 1 (default 1), pageSize 1..max (default def). */
export function parsePagination(
  searchParams: URLSearchParams,
  opts: { defaultPageSize?: number; maxPageSize?: number } = {},
): { page: number; pageSize: number } {
  const def = opts.defaultPageSize ?? 25;
  const max = opts.maxPageSize ?? 100;
  const pageRaw = parseInt(searchParams.get("page") ?? "", 10);
  const sizeRaw = parseInt(searchParams.get("pageSize") ?? "", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const pageSize = Number.isFinite(sizeRaw) && sizeRaw >= 1 ? Math.min(sizeRaw, max) : def;
  return { page, pageSize };
}

/** Shared filter parsing for GET /api/admin/orders and /api/admin/orders/export. */
export function buildOrdersWhere(searchParams: URLSearchParams): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  const search = searchParams.get("search")?.trim();
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerPhone: { contains: search, mode: "insensitive" } },
    ];
  }

  const status = searchParams.get("status")?.trim();
  if (status && isOrderStatus(status)) where.status = status;

  const payment = searchParams.get("payment")?.trim();
  if (payment) where.paymentMethod = payment;

  const from = parseDateRangeParam(searchParams.get("from"), "from");
  const to = parseDateRangeParam(searchParams.get("to"), "to");
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  return where;
}

export type OrdersSort = "createdAt_desc" | "createdAt_asc" | "total_desc" | "total_asc";

export function parseOrdersSort(searchParams: URLSearchParams): Prisma.OrderOrderByWithRelationInput {
  switch (searchParams.get("sort")) {
    case "createdAt_asc":
      return { createdAt: "asc" };
    case "total_desc":
      return { total: "desc" };
    case "total_asc":
      return { total: "asc" };
    default:
      return { createdAt: "desc" };
  }
}
