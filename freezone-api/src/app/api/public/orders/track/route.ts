import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";

/**
 * POST /api/public/orders/track — public order tracking (contract (h)).
 *
 * Request: `{ "orderNumber": "FZ-01042", "phone": "07701234567" }` — both
 * required. Phone match is digits-only on the last 9 digits (tolerates
 * `+964` / leading 0). Wrong number OR wrong phone both return 404 (no
 * oracle on which was wrong). Response is sanitized: no address, no internal
 * notes, no customer email. Rate limit 10/min/IP lives in server.ts.
 */
export async function POST(req: Request): Promise<Response> {
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const body = (await req.json().catch(() => null)) as
    | { orderNumber?: unknown; phone?: unknown }
    | null;
  const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  if (!orderNumber || !phone) return jsonError(400, "VALIDATION");

  const givenDigits = phone.replace(/\D/g, "").slice(-9);
  if (givenDigits.length < 7) return jsonError(404, "NOT_FOUND");

  try {
    const order = await prisma.order.findFirst({
      where: { orderNumber: { equals: orderNumber, mode: "insensitive" } },
      include: {
        items: { select: { nameSnapshot: true, qty: true, imageSnapshot: true } },
        statusEvents: {
          where: { kind: "status" },
          orderBy: { createdAt: "asc" },
          select: { toStatus: true, createdAt: true },
        },
      },
    });
    if (!order) return jsonError(404, "NOT_FOUND");

    const storedDigits = order.customerPhone.replace(/\D/g, "").slice(-9);
    if (!storedDigits || storedDigits !== givenDigits) return jsonError(404, "NOT_FOUND");

    return jsonOk({
      orderNumber: order.orderNumber,
      status: order.status,
      fulfillment: order.fulfillment,
      city: order.city,
      createdAt: order.createdAt.toISOString(),
      subtotal: order.subtotal,
      shipping: order.shipping,
      discountTotal: order.discountTotal,
      total: order.total,
      items: order.items.map((i) => ({
        name: i.nameSnapshot,
        qty: i.qty,
        image: i.imageSnapshot,
      })),
      timeline: [
        { status: "pending", at: order.createdAt.toISOString() },
        ...order.statusEvents
          .filter((e) => e.toStatus)
          .map((e) => ({ status: e.toStatus as string, at: e.createdAt.toISOString() })),
      ],
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
