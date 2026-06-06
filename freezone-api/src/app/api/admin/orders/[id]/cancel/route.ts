import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate } from "@/lib/admin-route-guard";
import { actorForAudit } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";

const MAX_REASON_LENGTH = 2000;

/**
 * POST /api/admin/orders/:id/cancel — cancel with explicit stock restore
 * (contract (c)). Single transaction:
 *   1. already cancelled  → 409 ALREADY_CANCELLED
 *   2. already delivered  → 409 ALREADY_DELIVERED
 *   3. status = cancelled
 *   4. restoreStock (default true): quantity += qty per line whose product
 *      still exists, inStock = true when quantity > 0, one StockMovement
 *      (+qty, "order_cancelled_restore") per line
 *   5. OrderStatusEvent (kind "status", toStatus "cancelled", note = reason)
 *   6. coupon usedCount decrement (floor 0)
 *   7. audit log order.cancel
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdminMutate(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return jsonError(400, "VALIDATION");

  const body = (await req.json().catch(() => null)) as
    | { reason?: unknown; restoreStock?: unknown }
    | null;
  const reason =
    typeof body?.reason === "string" ? body.reason.trim().slice(0, MAX_REASON_LENGTH) : "";
  const restoreStock = body?.restoreStock !== false;

  const audit = auditContext(g.actor, req);
  const actor = actorForAudit(g.actor);

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) return { error: jsonError(404, "NOT_FOUND") };
      if (order.status === "cancelled") return { error: jsonError(409, "ALREADY_CANCELLED") };
      if (order.status === "delivered") return { error: jsonError(409, "ALREADY_DELIVERED") };

      const fromStatus = order.status;
      await tx.order.update({ where: { id }, data: { status: "cancelled" } });

      const stockRestored: Array<{ productId: number; qty: number }> = [];
      if (restoreStock) {
        /** Pre-resolve which referenced products still exist so a missing
         *  product is skipped without throwing P2025 inside the transaction
         *  (which would abort it). */
        const lineProductIds = order.items
          .filter((l) => l.productId != null && l.qty > 0)
          .map((l) => l.productId as number);
        const existingProducts =
          lineProductIds.length > 0
            ? await tx.product.findMany({
                where: { id: { in: lineProductIds } },
                select: { id: true },
              })
            : [];
        const existingIds = new Set(existingProducts.map((p) => p.id));

        for (const line of order.items) {
          if (line.productId == null || line.qty <= 0) continue;
          if (!existingIds.has(line.productId)) continue;
          /** Atomic relative update — never read-then-write, so a concurrent
           *  checkout decrement or stock adjustment is not clobbered (lost
           *  update). qtyBefore/qtyAfter are derived from the returned row so
           *  the ledger always balances against the true quantity. */
          const updated = await tx.product.update({
            where: { id: line.productId },
            data: { quantity: { increment: line.qty } },
            select: { quantity: true },
          });
          const qtyAfter = updated.quantity;
          if (qtyAfter > 0) {
            await tx.product.update({
              where: { id: line.productId },
              data: { inStock: true },
            });
          }
          await tx.stockMovement.create({
            data: {
              productId: line.productId,
              delta: line.qty,
              reason: "order_cancelled_restore",
              orderId: id,
              qtyBefore: qtyAfter - line.qty,
              qtyAfter,
              userId: actor.userId,
              userEmail: actor.userEmail,
            },
          });
          stockRestored.push({ productId: line.productId, qty: line.qty });
        }
      }

      await tx.orderStatusEvent.create({
        data: {
          orderId: id,
          kind: "status",
          fromStatus,
          toStatus: "cancelled",
          note: reason || null,
          userId: actor.userId,
          userEmail: actor.userEmail,
        },
      });

      if (order.couponCode) {
        /** Guarded decrement — floor at 0 even under concurrent cancels. */
        await tx.coupon.updateMany({
          where: { code: order.couponCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }

      return { stockRestored };
    });

    if ("error" in outcome && outcome.error) return outcome.error;
    const stockRestored = "stockRestored" in outcome ? outcome.stockRestored : [];

    await logAdminAction("order.cancel", "Order", {
      entityId: id,
      payload: { reason: reason || null, restoreStock, stockRestored },
      ...audit,
    });
    if (stockRestored.length > 0) revalidateStorefrontData();

    return jsonOk({ id, status: "cancelled", stockRestored });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
