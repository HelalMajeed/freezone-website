/**
 * Shared bits between the orders list and the order detail page:
 * status vocabulary, badge tones, and i18n key helpers.
 */
import type { OrderStatus } from "@/lib/dashboard/api";
import type { DashboardMessageKey } from "@/lib/dashboard/i18n";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const STATUS_TONE: Record<
  OrderStatus,
  "neutral" | "info" | "warning" | "success" | "danger"
> = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
};

/** Catalog key for an order status label. */
export function statusKey(status: OrderStatus): DashboardMessageKey {
  return `status.${status}` as DashboardMessageKey;
}

export const PAYMENT_METHODS = [
  "cod",
  "zaincash",
  "qicard",
  "visa",
  "master",
  "store_pickup",
] as const;

/** Catalog key for a payment-method label; falls back to the raw value. */
export function paymentKey(method: string): DashboardMessageKey | null {
  return (PAYMENT_METHODS as readonly string[]).includes(method)
    ? (`payment.${method}` as DashboardMessageKey)
    : null;
}
