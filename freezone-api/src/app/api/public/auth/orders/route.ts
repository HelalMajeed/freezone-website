import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { jsonError } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { getCurrentCustomer } from "@/lib/customer-auth";

/**
 * GET /api/public/auth/orders — the signed-in customer's order history
 * (API_CONTRACT §2). Returns orders where `customerId` matches the session
 * customer OR `customerPhone` equals the account phone — the phone match
 * claims past guest orders placed with the same number. Items are shaped like
 * the public order-tracking response (sanitized: no address, no internal
 * notes, no customer email).
 */
export async function GET(req: Request): Promise<Response> {
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  try {
    const customer = await getCurrentCustomer(req);
    if (!customer) return jsonError(401, "UNAUTHENTICATED");

    /** Account phones are stored normalized (`07XXXXXXXXX`); legacy guest
     *  orders may carry `+964` / spaced variants, so match digits-only on the
     *  last 9 digits — same tolerance as /api/public/orders/track. */
    const last9 = customer.phone.replace(/\D/g, "").slice(-9);

    const candidates = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: customer.id },
          ...(last9.length === 9 ? [{ customerPhone: { contains: last9 } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        items: { select: { nameSnapshot: true, qty: true, imageSnapshot: true } },
        statusEvents: {
          where: { kind: "status" },
          orderBy: { createdAt: "asc" },
          select: { toStatus: true, createdAt: true },
        },
      },
    });

    const orders = candidates
      .filter(
        (o) =>
          o.customerId === customer.id ||
          (last9.length === 9 && o.customerPhone.replace(/\D/g, "").slice(-9) === last9),
      )
      .map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        fulfillment: o.fulfillment,
        city: o.city,
        createdAt: o.createdAt.toISOString(),
        subtotal: o.subtotal,
        shipping: o.shipping,
        discountTotal: o.discountTotal,
        total: o.total,
        items: o.items.map((i) => ({
          name: i.nameSnapshot,
          qty: i.qty,
          image: i.imageSnapshot,
        })),
        timeline: [
          { status: "pending", at: o.createdAt.toISOString() },
          ...o.statusEvents
            .filter((e) => e.toStatus)
            .map((e) => ({ status: e.toStatus as string, at: e.createdAt.toISOString() })),
        ],
      }));

    return Response.json({ ok: true, orders });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
