import { z } from "zod";
import type { Customer } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate, guardAdminRead } from "@/lib/admin-route-guard";
import { jsonError } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

/**
 * Customer admin detail + block toggle (API_CONTRACT §5).
 *
 * GET   /api/admin/customers/:id → { ok, customer, orders } (orders by
 *       customerId OR exact phone match — includes pre-signup guest orders)
 * PATCH /api/admin/customers/:id { isBlocked: boolean } — SUPER_ADMIN only,
 *       audited; blocking revokes every active CustomerSession.
 */

function serializeCustomer(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    isBlocked: c.isBlocked,
    lastLoginAt: c.lastLoginAt ? c.lastLoginAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return jsonError(400, "VALIDATION");

  try {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return jsonError(404, "NOT_FOUND");

    const orders = await prisma.order.findMany({
      where: { OR: [{ customerId: id }, { customerPhone: customer.phone }] },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        fulfillment: true,
        paymentMethod: true,
        city: true,
        total: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });

    return Response.json({
      ok: true,
      customer: serializeCustomer(customer),
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        fulfillment: o.fulfillment,
        paymentMethod: o.paymentMethod,
        city: o.city,
        total: o.total,
        itemCount: o._count.items,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

const patchSchema = z.object({ isBlocked: z.boolean() }).strict();

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Blocking a customer is account-level enforcement — SUPER_ADMIN only.
  const g = await guardAdminMutate(req, ["SUPER_ADMIN"]);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return jsonError(400, "VALIDATION");

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "VALIDATION");
  const { isBlocked } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return null;
      const customer = await tx.customer.update({ where: { id }, data: { isBlocked } });
      if (isBlocked) {
        // Blocked customers must drop out of any signed-in storefront session.
        await tx.customerSession.updateMany({
          where: { customerId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return customer;
    });

    if (!result) return jsonError(404, "NOT_FOUND");

    await logAdminAction(isBlocked ? "customer.block" : "customer.unblock", "Customer", {
      entityId: id,
      payload: { isBlocked, phone: result.phone },
      ...auditContext(g.actor, req),
    });

    return Response.json({ ok: true, customer: serializeCustomer(result) });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
