import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { validateCouponRecord } from "@/lib/coupon-service";
import { notifyOrderCreated, notifyStockEvent } from "@/lib/notifications";

type StockEvent = {
  type: "stock.low" | "stock.out";
  productId: number;
  nameEn: string;
  nameAr: string;
  quantity: number;
};

type OrderItemIn = {
  productId: number;
  name?: string;
  price?: number;
  qty: number;
  image?: string;
};

/** Cap per-line quantity to keep accidental/malicious 1e9-style payloads out of the DB and stock math. */
const MAX_QTY_PER_LINE = 999;

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

  /** Reject ad-hoc lines: every line must reference a real product so the server controls the price. */
  const normalizedItems = items.map((i) => ({
    productId: Number.isFinite(i.productId) ? Math.trunc(i.productId) : NaN,
    qty: Number.isFinite(i.qty) ? Math.trunc(i.qty) : NaN,
  }));
  if (normalizedItems.some((i) => !Number.isInteger(i.productId) || i.productId <= 0)) {
    return Response.json({ error: "INVALID_ITEMS" }, { status: 400 });
  }
  if (normalizedItems.some((i) => !Number.isInteger(i.qty) || i.qty < 1 || i.qty > MAX_QTY_PER_LINE)) {
    return Response.json({ error: "INVALID_QTY" }, { status: 400 });
  }

  const shipping = body.shipping;
  const total = body.total;

  if (!Number.isFinite(shipping) || shipping < 0 || !Number.isFinite(total) || total < 0) {
    return Response.json({ error: "Invalid order payload" }, { status: 400 });
  }

  const fulfillment = body.fulfillment === "pickup" ? "pickup" : "delivery";
  const addressLine = (cust.address ?? "").trim() || "—";
  const city = (cust.city ?? "").trim() || "—";

  try {
    const result = await prisma.$transaction(async (tx) => {
      /**
       * Load every referenced product in one query and price the order from the server-trusted
       * record. The client-supplied `price`/`name`/`image` fields are ignored — they used to be
       * stored verbatim, which let a tampered client buy a $1000 product for $1.
       */
      const productIds = Array.from(new Set(normalizedItems.map((i) => i.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, deletedAt: null },
        include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
      });
      const productById = new Map(products.map((p) => [p.id, p]));

      const priced: Array<{
        productId: number;
        qty: number;
        unitPrice: number;
        nameSnapshot: string;
        imageSnapshot: string | null;
      }> = [];

      for (const line of normalizedItems) {
        const p = productById.get(line.productId);
        if (!p) throw new Error("UNKNOWN_PRODUCT");
        if (!p.published) throw new Error("UNAVAILABLE");
        if (!p.inStock) throw new Error("OUT_OF_STOCK");
        if (p.quantity < line.qty) throw new Error("OUT_OF_STOCK");
        priced.push({
          productId: p.id,
          qty: line.qty,
          unitPrice: p.price,
          nameSnapshot: p.nameAr || p.nameEn || `#${p.id}`,
          imageSnapshot: p.images[0]?.url ?? null,
        });
      }

      const lineSubtotal = priced.reduce((s, i) => s + i.unitPrice * i.qty, 0);

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
          total: expectedTotal,
          couponCode: couponCodeOut,
          discountTotal,
          notes: body.notes?.trim() || null,
          items: {
            create: priced.map((i) => ({
              productId: i.productId,
              nameSnapshot: i.nameSnapshot,
              priceSnapshot: i.unitPrice,
              qty: i.qty,
              imageSnapshot: i.imageSnapshot,
            })),
          },
        },
      });

      const orderNumber = `FZ-${String(order.id).padStart(5, "0")}`;
      await tx.order.update({
        where: { id: order.id },
        data: { orderNumber },
      });

      /** Atomic decrement guarded by the WHERE clause — `updateMany` only
       *  affects rows whose current `quantity` is still >= the requested qty,
       *  so a concurrent transaction that already drained the stock leaves
       *  `count === 0` and we surface OUT_OF_STOCK. This replaces the previous
       *  read-then-update pattern that left a window for oversell. */
      for (const line of priced) {
        const updated = await tx.product.updateMany({
          where: { id: line.productId, quantity: { gte: line.qty } },
          data: { quantity: { decrement: line.qty } },
        });
        if (updated.count === 0) throw new Error("OUT_OF_STOCK");
      }
      /** Sync `inStock` for rows that just hit zero. Best-effort — the
       *  `quantity` column is the source of truth for buyers and the catalog
       *  endpoints already gate on `quantity > 0`. */
      for (const line of priced) {
        await tx.product.updateMany({
          where: { id: line.productId, quantity: 0 },
          data: { inStock: false },
        });
      }

      /** Append-only inventory ledger: one row per line, negative delta.
       *  Re-read the post-decrement quantities so qtyAfter reflects the true
       *  committed value (qtyBefore = qtyAfter + qty), keeping ledger balances
       *  exact rather than relying on the pre-transaction snapshot. */
      const afterRows = await tx.product.findMany({
        where: { id: { in: priced.map((l) => l.productId) } },
        select: { id: true, quantity: true },
      });
      const afterById = new Map(afterRows.map((r) => [r.id, r.quantity]));
      await tx.stockMovement.createMany({
        data: priced.map((line) => {
          const after = afterById.get(line.productId) ?? null;
          return {
            productId: line.productId,
            delta: -line.qty,
            reason: "order_placed",
            orderId: order.id,
            qtyBefore: after == null ? null : after + line.qty,
            qtyAfter: after,
          };
        }),
      });

      /** Inventory alerts (emitted best-effort after commit): flag products this
       *  order pushed to zero (stock.out) or at/under their low-stock threshold
       *  (stock.low). Only on the crossing edge — `before` is the pre-decrement
       *  quantity, `after` the committed one — so the ops inbox is not spammed on
       *  every subsequent order while a product stays low. */
      const stockEvents: StockEvent[] = [];
      for (const p of products) {
        const after = afterById.get(p.id);
        if (after == null) continue;
        const before = p.quantity;
        const threshold = p.lowStockThreshold ?? 0;
        if (after === 0 && before > 0) {
          stockEvents.push({ type: "stock.out", productId: p.id, nameEn: p.nameEn, nameAr: p.nameAr, quantity: after });
        } else if (threshold > 0 && after > 0 && after <= threshold && before > threshold) {
          stockEvents.push({ type: "stock.low", productId: p.id, nameEn: p.nameEn, nameAr: p.nameAr, quantity: after });
        }
      }

      return { id: order.id, orderNumber, customerName: order.customerName, total: expectedTotal, stockEvents };
    });

    /** New-order hook (contract (e)): broadcast a persistent dashboard
     *  notification. Best-effort — must never fail the placed order. */
    await notifyOrderCreated({
      id: result.id,
      orderNumber: result.orderNumber,
      customerName: result.customerName,
      total: result.total,
    });

    /** Low/out-of-stock alerts — best-effort, must never fail the placed order
     *  (createNotification already swallows its own errors). */
    for (const ev of result.stockEvents) {
      await notifyStockEvent(ev);
    }

    return Response.json({ id: result.id, orderNumber: result.orderNumber });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("COUPON:")) {
      return Response.json({ error: msg.replace(/^COUPON:/, "") }, { status: 400 });
    }
    if (msg === "COUPON_MISMATCH" || msg === "COUPON_REQUIRED" || msg === "TOTAL_MISMATCH") {
      return Response.json({ error: "تأكد من الكوبون والمجاميع وحاول مجدداً" }, { status: 400 });
    }
    if (msg === "UNKNOWN_PRODUCT" || msg === "UNAVAILABLE") {
      return Response.json(
        { error: "أحد المنتجات لم يعد متوفراً، حدّث السلة وحاول مجدداً", code: "UNKNOWN_PRODUCT" },
        { status: 400 },
      );
    }
    if (msg === "OUT_OF_STOCK") {
      return Response.json(
        { error: "الكمية المطلوبة غير متوفرة في المخزون", code: "OUT_OF_STOCK" },
        { status: 400 },
      );
    }
    console.error("[public/orders POST]", e);
    return Response.json({ error: "Order save failed" }, { status: 500 });
  }
}
