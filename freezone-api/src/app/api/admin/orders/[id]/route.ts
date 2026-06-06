import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate, guardAdminRead } from "@/lib/admin-route-guard";
import { actorForAudit } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { isOrderStatus } from "@/lib/admin-orders-query";

type EventRow = {
  id: number;
  kind: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  userId: number | null;
  userEmail: string | null;
  createdAt: Date;
};

function serializeEvent(e: EventRow) {
  return {
    id: e.id,
    kind: e.kind,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    note: e.note,
    userId: e.userId,
    userEmail: e.userEmail,
    createdAt: e.createdAt.toISOString(),
  };
}

/** GET /api/admin/orders/:id — order detail with timeline + internal notes (contract (b)). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return jsonError(400, "VALIDATION");

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
          },
        },
        statusEvents: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) return jsonError(404, "NOT_FOUND");

    return jsonOk({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      fulfillment: order.fulfillment,
      paymentMethod: order.paymentMethod,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      addressLine: order.addressLine,
      city: order.city,
      subtotal: order.subtotal,
      shipping: order.shipping,
      discountTotal: order.discountTotal,
      total: order.total,
      couponCode: order.couponCode,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        nameSnapshot: i.nameSnapshot,
        priceSnapshot: i.priceSnapshot,
        qty: i.qty,
        imageSnapshot: i.imageSnapshot,
        product: i.product
          ? { id: i.product.id, slug: i.product.slug, nameEn: i.product.nameEn, nameAr: i.product.nameAr }
          : null,
      })),
      statusHistory: order.statusEvents.filter((e) => e.kind === "status").map(serializeEvent),
      internalNotes: order.statusEvents.filter((e) => e.kind === "note").map(serializeEvent),
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

/**
 * PATCH /api/admin/orders/:id — status transition (contract (b)) and/or manual
 * shipping-fee edit (additive: body `{ shipping }`, integer IQD ≥ 0; total is
 * recomputed server-side). Transition to "cancelled" is rejected — use
 * POST /api/admin/orders/:id/cancel so stock restore is explicit.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdminMutate(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return jsonError(400, "VALIDATION");

  const body = (await req.json().catch(() => null)) as
    | { status?: unknown; shipping?: unknown }
    | null;

  const wantsStatus = body?.status !== undefined;
  const wantsShipping = body?.shipping !== undefined;
  if (!body || (!wantsStatus && !wantsShipping)) {
    return jsonError(400, "VALIDATION");
  }
  if (wantsStatus && !isOrderStatus(body.status)) {
    return jsonError(400, "VALIDATION");
  }
  if (wantsStatus && body.status === "cancelled") {
    return jsonError(409, "USE_CANCEL_ENDPOINT");
  }
  const shipping = wantsShipping ? Number(body.shipping) : null;
  if (wantsShipping && (!Number.isInteger(shipping) || (shipping as number) < 0)) {
    return jsonError(400, "VALIDATION");
  }

  const audit = auditContext(g.actor, req);
  const actor = actorForAudit(g.actor);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) return null;

      const data: { status?: string; shipping?: number; total?: number } = {};

      if (wantsStatus) {
        data.status = body.status as string;
        await tx.orderStatusEvent.create({
          data: {
            orderId: id,
            kind: "status",
            fromStatus: order.status,
            toStatus: body.status as string,
            userId: actor.userId,
            userEmail: actor.userEmail,
          },
        });
      }

      if (wantsShipping && shipping !== order.shipping) {
        data.shipping = shipping as number;
        data.total = Math.max(0, order.subtotal - order.discountTotal) + (shipping as number);
        await tx.orderStatusEvent.create({
          data: {
            orderId: id,
            kind: "note",
            note: `Shipping fee changed: ${order.shipping} → ${shipping} IQD`,
            userId: actor.userId,
            userEmail: actor.userEmail,
          },
        });
      }

      const updated = Object.keys(data).length
        ? await tx.order.update({ where: { id }, data })
        : order;
      return { before: order, after: updated };
    });

    if (!result) return jsonError(404, "NOT_FOUND");

    await logAdminAction("order.update", "Order", {
      entityId: id,
      payload: {
        ...(wantsStatus ? { from: result.before.status, to: result.after.status } : {}),
        ...(wantsShipping
          ? { shippingBefore: result.before.shipping, shippingAfter: result.after.shipping }
          : {}),
      },
      ...audit,
    });

    return jsonOk({
      id,
      status: result.after.status,
      shipping: result.after.shipping,
      total: result.after.total,
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
