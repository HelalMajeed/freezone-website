import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { validateCouponRecord } from "@/lib/coupon-service";

type OrderItemIn = {
  productId: number;
  name: string;
  price: number;
  qty: number;
  image?: string;
};

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "NO_DATABASE", code: "NO_DATABASE" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    fulfillment?: string;
    paymentMethod?: string;
    customer?: { name?: string; phone?: string; address?: string; city?: string };
    items?: OrderItemIn[];
    subtotal?: number;
    discountTotal?: number;
    couponCode?: string;
    shipping?: number;
    total?: number;
    notes?: string;
  } | null;

  const cust = body?.customer;
  const items = body?.items;
  if (
    !body ||
    !cust?.name?.trim() ||
    !cust?.phone?.trim() ||
    !Array.isArray(items) ||
    items.length === 0 ||
    typeof body.shipping !== "number" ||
    typeof body.total !== "number" ||
    !body.paymentMethod?.trim()
  ) {
    return Response.json({ error: "Invalid order payload" }, { status: 400 });
  }

  const shipping = body.shipping;
  const total = body.total;

  const fulfillment = body.fulfillment === "pickup" ? "pickup" : "delivery";
  const addressLine = (cust.address ?? "").trim() || "—";
  const city = (cust.city ?? "").trim() || "—";

  const lineSubtotal = items.reduce((s, i) => s + i.price * Math.max(1, i.qty), 0);

  try {
    const result = await prisma.$transaction(async (tx) => {
      let discountTotal = 0;
      let couponCodeOut: string | null = null;
      const code = body.couponCode?.trim().toUpperCase();

      if (code) {
        const c = await tx.coupon.findUnique({ where: { code } });
        const v = validateCouponRecord(c, lineSubtotal);
        if (!v.ok) {
          throw new Error(`COUPON:${v.error}`);
        }
        const clientDisc = typeof body.discountTotal === "number" ? body.discountTotal : 0;
        if (Math.abs(v.discount - clientDisc) > 1) {
          throw new Error("COUPON_MISMATCH");
        }
        discountTotal = v.discount;
        couponCodeOut = v.code;
        await tx.coupon.update({
          where: { id: v.couponId },
          data: { usedCount: { increment: 1 } },
        });
      } else if (body.discountTotal && body.discountTotal > 0) {
        throw new Error("COUPON_REQUIRED");
      }

      const afterDiscount = Math.max(0, lineSubtotal - discountTotal);
      const expectedTotal = afterDiscount + shipping;
      if (Math.abs(expectedTotal - total) > 2) {
        throw new Error("TOTAL_MISMATCH");
      }

      const tempKey = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const order = await tx.order.create({
        data: {
          orderNumber: tempKey,
          status: "pending",
          fulfillment,
          paymentMethod: body.paymentMethod!.trim(),
          customerName: cust.name!.trim(),
          customerPhone: cust.phone!.trim(),
          customerEmail: null,
          addressLine,
          city,
          subtotal: lineSubtotal,
          shipping,
          total,
          couponCode: couponCodeOut,
          discountTotal,
          notes: body.notes?.trim() || null,
          items: {
            create: items.map((i) => ({
              productId: Number.isFinite(i.productId) ? i.productId : null,
              nameSnapshot: i.name,
              priceSnapshot: i.price,
              qty: Math.max(1, i.qty),
              imageSnapshot: i.image ?? null,
            })),
          },
        },
      });

      const orderNumber = `FZ-${String(order.id).padStart(5, "0")}`;
      await tx.order.update({
        where: { id: order.id },
        data: { orderNumber },
      });

      for (const line of items) {
        const pid = Number.isFinite(line.productId) ? line.productId : null;
        if (pid == null) continue;
        const pr = await tx.product.findUnique({ where: { id: pid } });
        if (!pr) continue;
        const nextQty = Math.max(0, pr.quantity - Math.max(1, line.qty));
        await tx.product.update({
          where: { id: pid },
          data: { quantity: nextQty, inStock: nextQty > 0 && pr.inStock },
        });
      }

      return { id: order.id, orderNumber };
    });

    return Response.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("COUPON:")) {
      return Response.json({ error: msg.replace(/^COUPON:/, "") }, { status: 400 });
    }
    if (msg === "COUPON_MISMATCH" || msg === "COUPON_REQUIRED" || msg === "TOTAL_MISMATCH") {
      return Response.json({ error: "تأكد من الكوبون والمجاميع وحاول مجدداً" }, { status: 400 });
    }
    console.error("[public/orders POST]", e);
    return Response.json({ error: "Order save failed" }, { status: 500 });
  }
}
