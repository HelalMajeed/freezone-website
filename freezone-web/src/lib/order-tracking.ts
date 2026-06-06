import { freezoneApiUrl, getInternalApiFetchSignal } from "./api-internal";
import type { OrderStatus } from "./siteStore";

/**
 * Public order tracking — contract (h) POST /api/public/orders/track in
 * fz-ws1-backend/docs/API_CONTRACTS.md. Sanitized payload: no address,
 * no internal notes, no customer email.
 */
export type PublicTrackedOrder = {
  orderNumber: string;
  status: OrderStatus;
  fulfillment: "delivery" | "pickup";
  city: string;
  createdAt: string;
  subtotal: number;
  shipping: number;
  discountTotal: number;
  total: number;
  items: { name: string; qty: number; image: string | null }[];
  timeline: { status: OrderStatus; at: string }[];
};

export type OrderTrackErrorCode = "NOT_FOUND" | "RATE_LIMITED" | "GENERIC";

export class OrderTrackError extends Error {
  code: OrderTrackErrorCode;
  constructor(code: OrderTrackErrorCode) {
    super(code);
    this.code = code;
    this.name = "OrderTrackError";
  }
}

export async function trackPublicOrder(orderNumber: string, phone: string): Promise<PublicTrackedOrder> {
  let res: Response;
  try {
    res = await fetch(freezoneApiUrl("/api/public/orders/track"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      signal: getInternalApiFetchSignal(),
      body: JSON.stringify({ orderNumber: orderNumber.trim(), phone: phone.trim() }),
    });
  } catch {
    throw new OrderTrackError("GENERIC");
  }
  if (res.status === 404) throw new OrderTrackError("NOT_FOUND");
  if (res.status === 429) throw new OrderTrackError("RATE_LIMITED");
  const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: PublicTrackedOrder } | null;
  if (!res.ok || !json?.ok || !json.data?.orderNumber) throw new OrderTrackError("GENERIC");
  return json.data;
}

/**
 * Device-local order memory — checkout and successful tracks write here so
 * the account page can show an order history without an auth backend.
 */
export type RememberedOrder = {
  orderNumber: string;
  phone: string;
  total: number;
  status?: OrderStatus;
  createdAt: string;
};

const MY_ORDERS_KEY = "fz:my-orders:v1";
const MY_ORDERS_MAX = 12;

export function readRememberedOrders(): RememberedOrder[] {
  try {
    const raw = window.localStorage.getItem(MY_ORDERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (o): o is RememberedOrder =>
        !!o && typeof o === "object" && typeof (o as RememberedOrder).orderNumber === "string",
    );
  } catch {
    return [];
  }
}

export function rememberOrder(order: RememberedOrder): void {
  try {
    const prev = readRememberedOrders().filter((o) => o.orderNumber !== order.orderNumber);
    const next = [order, ...prev].slice(0, MY_ORDERS_MAX);
    window.localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — order memory is an optimization only */
  }
}
