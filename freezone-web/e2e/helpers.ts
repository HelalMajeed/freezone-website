import { expect, type APIRequestContext, type Page } from "playwright/test";

/**
 * Shared helpers for the FreeZone E2E smoke suite. Specs must stay independent
 * (no cross-spec state): anything a spec needs (a product id, a placed order)
 * it fetches or creates itself through these helpers.
 */

/** Seeded superadmin — matches the seed command documented in e2e/README.md. */
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || "qa-admin@freezone-iq.com",
  phone: process.env.E2E_ADMIN_PHONE || "07712345678",
  password: process.env.E2E_ADMIN_PASSWORD || "Qa!Freezone2026#Smoke",
  /** Display name (header user-menu button) — DASHBOARD_SEED_NAME at seed time. */
  name: process.env.E2E_ADMIN_NAME || "QA Admin",
};

/**
 * Unique-per-run Iraqi mobile (07XXXXXXXXX). Specs create customers, orders
 * and reviews keyed by phone (duplicate-review guard, PHONE_TAKEN), so a
 * wall-clock + random suffix keeps reruns against the same DB green.
 */
export function uniquePhone(): string {
  const clock = String(Date.now()).slice(-7);
  const rand = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `07${clock}${rand}`;
}

export type CatalogProduct = {
  id: number;
  name: string;
  price: number;
  cat: string;
  inStock: boolean;
};

type BootstrapBody = {
  catalog: { products: CatalogProduct[] };
  site: { shippingFees?: Record<string, number>; freeDeliveryThreshold?: number };
};

/** One bootstrap fetch per process — the payload is heavy and read-only. */
let bootstrapCache: BootstrapBody | null = null;

export async function fetchBootstrap(request: APIRequestContext): Promise<BootstrapBody> {
  if (bootstrapCache) return bootstrapCache;
  const res = await request.get("/api/ssr/storefront-bootstrap?locale=en");
  expect(res.ok(), "storefront bootstrap should answer (is the API on :4000 with a seeded DB?)").toBe(true);
  bootstrapCache = (await res.json()) as BootstrapBody;
  return bootstrapCache;
}

/** First in-stock product matching `match` (seeded demo catalog, README setup). */
export async function findProduct(
  request: APIRequestContext,
  match: RegExp,
): Promise<CatalogProduct> {
  const { catalog } = await fetchBootstrap(request);
  const product = catalog.products.find((p) => p.inStock && match.test(p.name));
  expect(product, `expected a seeded in-stock product matching ${match} — run db:seed:demo`).toBeTruthy();
  return product as CatalogProduct;
}

/**
 * A cheap (< free-delivery threshold) in-stock product, so the per-province
 * delivery fee actually shows up in checkout totals instead of FREE shipping.
 */
export async function findCheapProduct(request: APIRequestContext): Promise<CatalogProduct> {
  const body = await fetchBootstrap(request);
  const threshold = body.site.freeDeliveryThreshold ?? 100_000;
  const product = body.catalog.products
    .filter((p) => p.inStock && p.price > 0 && p.price < threshold)
    .sort((a, b) => a.price - b.price)[0];
  expect(product, "expected a seeded in-stock product below the free-delivery threshold").toBeTruthy();
  return product;
}

/** Open a PDP and add the product to the cart; resolves once the drawer opens. */
export async function addToCartViaPdp(page: Page, product: CatalogProduct): Promise<void> {
  await page.goto(`/en/product/${product.id}`);
  await expect(page.getByRole("heading", { level: 1, name: product.name })).toBeVisible();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByRole("dialog", { name: "Your Cart" })).toBeVisible();
}

/**
 * Place a COD order straight through the public API (used by tracking — the
 * UI checkout journey itself is covered in checkout.spec.ts). The server
 * recomputes prices and shipping and rejects totals that drift (>2 IQD), so
 * the body mirrors the storefront math: per-province fee unless the subtotal
 * clears the free-delivery threshold.
 */
export async function placeOrderViaApi(
  request: APIRequestContext,
  opts: { product: CatalogProduct; phone: string; city?: string; name?: string },
): Promise<string> {
  const city = opts.city ?? "basra";
  const { site } = await fetchBootstrap(request);
  const subtotal = opts.product.price;
  const fee = site.shippingFees?.[city] ?? 5000;
  const threshold = site.freeDeliveryThreshold ?? 100_000;
  const shipping = subtotal >= threshold ? 0 : fee;
  const res = await request.post("/api/public/orders", {
    data: {
      fulfillment: "delivery",
      paymentMethod: "cod",
      customer: {
        name: opts.name ?? "E2E Shopper",
        phone: opts.phone,
        address: "Test street 1, building 2",
        city,
      },
      items: [
        {
          productId: opts.product.id,
          name: opts.product.name,
          price: opts.product.price,
          qty: 1,
        },
      ],
      subtotal,
      shipping,
      total: subtotal + shipping,
    },
  });
  expect(res.status(), "order POST should succeed").toBe(200);
  const body = (await res.json()) as { orderNumber?: string };
  expect(body.orderNumber, "order response should include an FZ-#### number").toMatch(/^FZ-/);
  return body.orderNumber as string;
}

/**
 * The admin shell is Arabic-first by default; pinning the persisted language
 * preference to English keeps the admin spec's text selectors deterministic.
 */
export async function useEnglishAdminUi(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("fz-dashboard-lang", "en");
  });
}

/**
 * Sign in to the admin panel through the real login form.
 * `identifier` may be the admin email or Iraqi phone — both are supported.
 */
export async function adminLogin(page: Page, identifier: string, password: string): Promise<void> {
  await page.goto("/admin/login");
  // The page first attempts passwordless direct entry; with ADMIN_DIRECT_LOGIN
  // unset the API answers 403 and the credential form renders.
  const idField = page.locator('input[name="identifier"]');
  await expect(idField).toBeVisible();
  await idField.fill(identifier);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin(\/|$|\?)/);
  await expect(page).not.toHaveURL(/\/admin\/login/);
}
