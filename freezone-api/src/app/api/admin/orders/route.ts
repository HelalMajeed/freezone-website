import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate, guardAdminRead } from "@/lib/admin-route-guard";
import { actorForAudit } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import {
  buildOrdersWhere,
  isAllowedOrderTransition,
  isOrderStatus,
  parseOrdersSort,
  parsePagination,
} from "@/lib/admin-orders-query";

/**
 * GET /api/admin/orders — paginated, filterable orders list (contract (a) in
 * docs/API_CONTRACTS.md). `totals` is computed over the full filtered set;
 * `revenue`/`aov` exclude cancelled orders.
 */
export async function GET(req: Request) {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return jsonError(503, "NO_DATABASE");
  }

  const { searchParams } = new URL(req.url);
  const where = buildOrdersWhere(searchParams);
  const orderBy = parseOrdersSort(searchParams);
  const { page, pageSize } = parsePagination(searchParams);

  try {
    const [rows, total, sums, nonCancelled] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: { select: { qty: true } } },
      }),
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where,
        _sum: { discountTotal: true, shipping: true },
      }),
      prisma.order.aggregate({
        where: { AND: [where, { status: { not: "cancelled" } }] },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);

    const revenue = nonCancelled._sum.total ?? 0;
    const nonCancelledCount = nonCancelled._count._all;

    return jsonOk({
      items: rows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        fulfillment: o.fulfillment,
        paymentMethod: o.paymentMethod,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        city: o.city,
        itemCount: o.items.reduce((s, i) => s + i.qty, 0),
        subtotal: o.subtotal,
        shipping: o.shipping,
        discountTotal: o.discountTotal,
        total: o.total,
        couponCode: o.couponCode,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      totals: {
        count: total,
        revenue,
        discount: sums._sum.discountTotal ?? 0,
        shipping: sums._sum.shipping ?? 0,
        aov: nonCancelledCount > 0 ? Math.floor(revenue / nonCancelledCount) : 0,
      },
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

/**
 * Legacy collection-level status PATCH (body `{ id, status }`) — **deprecated**,
 * kept working during the rebuild wave. New consumers use
 * `PATCH /api/admin/orders/:id`. Writes the same OrderStatusEvent and rejects
 * `cancelled` (use POST /api/admin/orders/:id/cancel).
 */
export async function PATCH(req: Request) {
  const g = await guardAdminMutate(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return jsonError(503, "NO_DATABASE");
  }

  const body = (await req.json().catch(() => null)) as { id?: number; status?: string } | null;
  const id = body?.id;
  const status = body?.status;
  if (typeof id !== "number" || !status || !isOrderStatus(status)) {
    return Response.json({ error: "id and valid status required" }, { status: 400 });
  }
  if (status === "cancelled") {
    return jsonError(409, "USE_CANCEL_ENDPOINT");
  }

  const audit = auditContext(g.actor, req);
  const actor = actorForAudit(g.actor);

  try {
    const existing = await prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return jsonError(404, "NOT_FOUND");

    /** Same forward-only guard as PATCH /api/admin/orders/:id — never reopen a
     *  terminal (cancelled/delivered) order, since reopening would leave the
     *  cancel endpoint's restored stock double-counted. */
    if (
      isOrderStatus(existing.status) &&
      !isAllowedOrderTransition(existing.status, status)
    ) {
      return jsonError(409, "INVALID_TRANSITION");
    }

    await prisma.$transaction([
      prisma.order.update({ where: { id }, data: { status } }),
      prisma.orderStatusEvent.create({
        data: {
          orderId: id,
          kind: "status",
          fromStatus: existing.status,
          toStatus: status,
          userId: actor.userId,
          userEmail: actor.userEmail,
        },
      }),
    ]);
    await logAdminAction("order.status", "Order", {
      entityId: id,
      payload: { from: existing.status, to: status },
      ...audit,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
