import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

/**
 * Persistent dashboard notifications (contract (e) in docs/API_CONTRACTS.md).
 * `recipientId: null` = broadcast row visible to every admin; read-state lives
 * on the row (`readAt`) — broadcast rows are marked read globally (documented
 * tradeoff for a small ops team).
 */

/** Frozen vocabulary — extend-only. */
export const NOTIFICATION_TYPES = [
  "order.created",
  "order.cancelled",
  "stock.low",
  "stock.out",
  "review.pending",
  "contact.message",
  "system",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type CreateNotificationInput = {
  type: NotificationType;
  titleEn: string;
  titleAr: string;
  bodyEn?: string;
  bodyAr?: string;
  /** Admin deep-link, e.g. /admin/orders/1042 (legacy /dashboard hrefs still redirect) */
  href?: string | null;
  entity?: string | null;
  entityId?: string | number | null;
  payloadJson?: Prisma.InputJsonValue | null;
  /** null/omitted = broadcast to all admins. */
  recipientId?: number | null;
};

/**
 * Best-effort insert — a notification failure must never break the write path
 * that triggered it (order placement, contact form, …). Returns the new row id
 * or null when skipped/failed.
 */
export async function createNotification(input: CreateNotificationInput): Promise<number | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const row = await prisma.notification.create({
      data: {
        recipientId: input.recipientId ?? null,
        type: input.type,
        titleEn: input.titleEn,
        titleAr: input.titleAr,
        bodyEn: input.bodyEn ?? "",
        bodyAr: input.bodyAr ?? "",
        href: input.href ?? null,
        entity: input.entity ?? null,
        entityId: input.entityId == null ? null : String(input.entityId),
        ...(input.payloadJson != null ? { payloadJson: input.payloadJson } : {}),
      },
      select: { id: true },
    });
    return row.id;
  } catch (e) {
    console.error("[notifications] create failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Integer IQD with thousands separators (matches the contract examples). */
export function formatIqd(amount: number): string {
  return amount.toLocaleString("en-US");
}

/** Broadcast `order.created` row for the dashboard inbox (new-order hook). */
export async function notifyOrderCreated(order: {
  id: number;
  orderNumber: string;
  customerName: string;
  total: number;
}): Promise<void> {
  await createNotification({
    type: "order.created",
    titleEn: `New order ${order.orderNumber}`,
    titleAr: `طلب جديد ${order.orderNumber}`,
    bodyEn: `${order.customerName} — ${formatIqd(order.total)} IQD`,
    bodyAr: `${order.customerName} — ${formatIqd(order.total)} د.ع`,
    href: `/admin/orders/${order.id}`,
    entity: "Order",
    entityId: order.id,
  });
}

/**
 * Inventory alert for the dashboard inbox (broadcast). `stock.out` when a product
 * reaches 0, `stock.low` when it crosses at/under its low-stock threshold. Emit
 * only on the crossing edge so the inbox is not re-notified on every later order.
 */
export async function notifyStockEvent(input: {
  type: "stock.low" | "stock.out";
  productId: number;
  nameEn: string;
  nameAr: string;
  quantity: number;
}): Promise<void> {
  const out = input.type === "stock.out";
  await createNotification({
    type: input.type,
    titleEn: out ? `Out of stock: ${input.nameEn}` : `Low stock: ${input.nameEn}`,
    titleAr: out ? `نفد المخزون: ${input.nameAr}` : `مخزون منخفض: ${input.nameAr}`,
    bodyEn: out
      ? `${input.nameEn} is now out of stock.`
      : `${input.nameEn} has ${formatIqd(input.quantity)} left in stock.`,
    bodyAr: out
      ? `${input.nameAr} نفد من المخزون.`
      : `${input.nameAr} متبقٍ منه ${formatIqd(input.quantity)} في المخزون.`,
    href: `/admin/products/${input.productId}`,
    entity: "Product",
    entityId: input.productId,
  });
}
