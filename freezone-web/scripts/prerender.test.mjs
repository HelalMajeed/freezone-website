import { test, expect, vi, afterEach } from "vitest";
import { fetchCatalog, fetchAllProducts } from "./prerender.mjs";

/**
 * Regression guard for the Phase-1 bootstrap trim (PR #56/#57): the build-time
 * SEO prerender must NEVER require `catalog.products` on the storefront bootstrap
 * (it was removed so the browser never receives the whole catalog). Products for
 * the per-PDP shells come from the server-paginated /api/ssr/catalog/products
 * endpoint instead. These tests stub fetch — no network — and lock that contract.
 */

/** Minimal Response-like for the stubbed global fetch. */
function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 500, statusText: ok ? "OK" : "ERR", json: async () => body };
}

/** The Phase-1 (trimmed) bootstrap shape — note: NO `catalog.products`. */
const TRIMMED_BOOTSTRAP = {
  catalog: {
    categories: [{ id: "laptops", name: "Laptops" }],
    brands: [{ name: "Acme", img: null }],
    collections: { featured: [], newest: [], onSale: [], bestSellers: [], hasNew: false },
    brandCounts: [{ value: "Acme", count: 1 }],
  },
  site: {},
};

const makeProduct = (id) => ({
  id,
  name: `Product ${id}`,
  desc: "",
  price: 1000,
  images: [],
  inStock: true,
  brand: "Acme",
  cat: "laptops",
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("fetchCatalog pages products from the listing endpoint, not catalog.products", async () => {
  const calls = [];
  vi.stubGlobal("fetch", async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("storefront-bootstrap")) return jsonResponse(TRIMMED_BOOTSTRAP);
    if (u.includes("/api/ssr/catalog/products")) {
      return jsonResponse({ products: [makeProduct(1), makeProduct(2)], total: 2, page: 1, pageSize: 100 });
    }
    throw new Error(`unexpected url ${u}`);
  });

  const catalog = await fetchCatalog("en");

  expect(catalog.products.map((p) => p.id)).toEqual([1, 2]);
  expect(catalog.categories).toHaveLength(1);
  expect(catalog.brands).toHaveLength(1);
  // Must consult the bootstrap (categories/brands) AND the paginated listing (products).
  expect(calls.some((u) => u.includes("storefront-bootstrap"))).toBe(true);
  expect(calls.some((u) => u.includes("/api/ssr/catalog/products"))).toBe(true);
});

test("fetchCatalog does not throw on a bootstrap without catalog.products", async () => {
  expect("products" in TRIMMED_BOOTSTRAP.catalog).toBe(false);
  vi.stubGlobal("fetch", async (url) => {
    if (String(url).includes("storefront-bootstrap")) return jsonResponse(TRIMMED_BOOTSTRAP);
    return jsonResponse({ products: [], total: 0, page: 1, pageSize: 100 });
  });
  const catalog = await fetchCatalog("ar");
  expect(Array.isArray(catalog.products)).toBe(true);
});

test("fetchAllProducts pages until a short page and returns every product", async () => {
  vi.stubGlobal("fetch", async (url) => {
    const page = Number(new URL(String(url)).searchParams.get("page"));
    const count = page <= 2 ? 100 : 10; // pages 1,2 full → page 3 short → stop
    const start = (page - 1) * 100;
    const products = Array.from({ length: count }, (_, i) => makeProduct(start + i + 1));
    return jsonResponse({ products, total: 210, page, pageSize: 100 });
  });
  const all = await fetchAllProducts("en");
  expect(all).toHaveLength(210);
});
