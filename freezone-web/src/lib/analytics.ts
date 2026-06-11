/**
 * GA4 + Meta Pixel analytics (API_CONTRACT §8).
 *
 * Loaders are no-ops unless `VITE_GA4_ID` / `VITE_META_PIXEL_ID` are set at
 * build time — a build without the env vars ships zero third-party scripts.
 * Page views are wired in LocaleLayout (route-change hook); the remaining
 * e-commerce call sites (PDP, cart, checkout) are integrated in Phase 3.
 */

type Gtag = (...args: unknown[]) => void;
type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const GA4_ID = ((import.meta.env.VITE_GA4_ID as string | undefined) ?? "").trim();
const PIXEL_ID = ((import.meta.env.VITE_META_PIXEL_ID as string | undefined) ?? "").trim();
const CURRENCY = "IQD";

const enabled = Boolean(GA4_ID || PIXEL_ID);
let initialized = false;

function loadGa4(): void {
  window.dataLayer = window.dataLayer || [];
  // gtag.js requires the literal `arguments` object on the dataLayer (it
  // detects Arguments instances) — a rest-args array would be ignored.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  /** Route changes fire page_view manually — disable the automatic one. */
  window.gtag("config", GA4_ID, { send_page_view: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`;
  document.head.appendChild(s);
}

function loadPixel(): void {
  if (window.fbq) return;
  const fbq: Fbq = function () {
    if (fbq.callMethod) {
      // eslint-disable-next-line prefer-rest-params, prefer-spread
      fbq.callMethod.apply(fbq, Array.prototype.slice.call(arguments));
    } else {
      // eslint-disable-next-line prefer-rest-params
      fbq.queue!.push(arguments);
    }
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  window.fbq("init", PIXEL_ID);
}

/** Idempotent — safe to call from every tracker. */
export function initAnalytics(): void {
  if (initialized || !enabled || typeof window === "undefined") return;
  initialized = true;
  if (GA4_ID) loadGa4();
  if (PIXEL_ID) loadPixel();
}

function gaEvent(name: string, params: Record<string, unknown>): void {
  if (GA4_ID && window.gtag) window.gtag("event", name, params);
}

function pixelEvent(name: string, params?: Record<string, unknown>): void {
  if (PIXEL_ID && window.fbq) window.fbq("track", name, params ?? {});
}

// ─── Event payload shapes ────────────────────────────────────────────────────

export type AnalyticsItem = {
  id: number | string;
  name: string;
  /** Integer IQD. */
  price: number;
  quantity?: number;
  category?: string;
  brand?: string;
};

export type AnalyticsOrder = {
  orderNumber: string;
  /** Integer IQD. */
  total: number;
  shipping?: number;
  items: AnalyticsItem[];
};

function gaItems(items: AnalyticsItem[]) {
  return items.map((it) => ({
    item_id: String(it.id),
    item_name: it.name,
    price: it.price,
    quantity: it.quantity ?? 1,
    ...(it.category ? { item_category: it.category } : {}),
    ...(it.brand ? { item_brand: it.brand } : {}),
  }));
}

function cartValue(items: AnalyticsItem[]): number {
  return items.reduce((sum, it) => sum + it.price * (it.quantity ?? 1), 0);
}

// ─── Trackers (no-ops when no analytics ID is configured) ────────────────────

export function trackPageView(path?: string): void {
  if (!enabled || typeof window === "undefined") return;
  initAnalytics();
  const page = path ?? window.location.pathname + window.location.search;
  gaEvent("page_view", {
    page_location: window.location.origin + page,
    page_path: page,
    page_title: document.title,
  });
  pixelEvent("PageView");
}

export function trackViewItem(product: AnalyticsItem): void {
  if (!enabled || typeof window === "undefined") return;
  initAnalytics();
  gaEvent("view_item", { currency: CURRENCY, value: product.price, items: gaItems([product]) });
  pixelEvent("ViewContent", {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: "product",
    value: product.price,
    currency: CURRENCY,
  });
}

export function trackAddToCart(item: AnalyticsItem, qty = 1): void {
  if (!enabled || typeof window === "undefined") return;
  initAnalytics();
  gaEvent("add_to_cart", {
    currency: CURRENCY,
    value: item.price * qty,
    items: gaItems([{ ...item, quantity: qty }]),
  });
  pixelEvent("AddToCart", {
    content_ids: [String(item.id)],
    content_name: item.name,
    content_type: "product",
    value: item.price * qty,
    currency: CURRENCY,
  });
}

export function trackBeginCheckout(cart: AnalyticsItem[]): void {
  if (!enabled || typeof window === "undefined") return;
  initAnalytics();
  gaEvent("begin_checkout", { currency: CURRENCY, value: cartValue(cart), items: gaItems(cart) });
  pixelEvent("InitiateCheckout", {
    content_ids: cart.map((it) => String(it.id)),
    value: cartValue(cart),
    currency: CURRENCY,
    num_items: cart.reduce((sum, it) => sum + (it.quantity ?? 1), 0),
  });
}

export function trackPurchase(order: AnalyticsOrder): void {
  if (!enabled || typeof window === "undefined") return;
  initAnalytics();
  gaEvent("purchase", {
    transaction_id: order.orderNumber,
    currency: CURRENCY,
    value: order.total,
    ...(order.shipping != null ? { shipping: order.shipping } : {}),
    items: gaItems(order.items),
  });
  pixelEvent("Purchase", {
    content_ids: order.items.map((it) => String(it.id)),
    content_type: "product",
    value: order.total,
    currency: CURRENCY,
    num_items: order.items.reduce((sum, it) => sum + (it.quantity ?? 1), 0),
  });
}
