import { test } from "node:test";
import assert from "node:assert/strict";
import { GET as bootstrapGET } from "../app/api/ssr/storefront-bootstrap/route";
import { GET as byIdsGET } from "../app/api/ssr/catalog/products/by-ids/route";
import { GET as pcBuildCatalogGET } from "../app/api/ssr/pc-build-catalog/route";
import { MAX_PRODUCTS_BY_IDS, getProductsByIds } from "./catalog";

/**
 * Phase-1 bootstrap trim regression suite. These run on the static path (no
 * DATABASE_URL in CI), so collections are empty here — the assertions lock in
 * the SHAPE/contract, not the data: the customer browser must never receive the
 * full product catalog through storefront-bootstrap.
 */

const req = (url: string) => new Request(url);

test("storefront-bootstrap never ships the full product catalog", async () => {
  const res = await bootstrapGET(req("http://localhost/api/ssr/storefront-bootstrap?locale=en"));
  const body = (await res.json()) as { catalog: Record<string, unknown> };
  assert.ok(body.catalog, "catalog block present");
  // The whole point of the trim — no `products` array in the payload.
  assert.equal("products" in body.catalog, false, "catalog.products must be gone");
  assert.ok(Array.isArray(body.catalog.categories), "categories present");
  assert.ok(Array.isArray(body.catalog.brands), "brands present");
  assert.ok(body.catalog.collections, "capped home collections present");
  assert.ok(Array.isArray(body.catalog.brandCounts), "server brand counts present");
});

test("storefront-bootstrap home collections are capped slices, not the catalog", async () => {
  const res = await bootstrapGET(req("http://localhost/api/ssr/storefront-bootstrap?locale=ar"));
  const body = (await res.json()) as {
    catalog: { collections: { featured: unknown[]; newest: unknown[]; onSale: unknown[]; bestSellers: unknown[]; hasNew: boolean } };
  };
  const c = body.catalog.collections;
  assert.ok(c.featured.length <= 16, "featured capped");
  assert.ok(c.newest.length <= 16, "newest capped");
  assert.ok(c.onSale.length <= 12, "onSale capped");
  assert.ok(c.bestSellers.length <= 16, "bestSellers capped");
  assert.equal(typeof c.hasNew, "boolean");
});

test("by-ids endpoint returns an array and the id cap stays at 100", async () => {
  assert.equal(MAX_PRODUCTS_BY_IDS, 100);
  const res = await byIdsGET(
    req("http://localhost/api/ssr/catalog/products/by-ids?ids=1,2,2,abc,-5,3&locale=en"),
  );
  const body = (await res.json()) as { products: unknown[] };
  assert.ok(Array.isArray(body.products));
  // Even a 200-id request must be capped to MAX_PRODUCTS_BY_IDS by the helper.
  const many = Array.from({ length: 200 }, (_, i) => i + 1);
  const capped = await getProductsByIds(many, "en");
  assert.ok(capped.length <= MAX_PRODUCTS_BY_IDS, "ids over the cap are truncated");
});

test("pc-build catalog is a separate lazy endpoint, isolated from bootstrap", async () => {
  const res = await pcBuildCatalogGET(req("http://localhost/api/ssr/pc-build-catalog?locale=en"));
  const body = (await res.json()) as { products: unknown[] };
  assert.ok(Array.isArray(body.products), "pc-build serves its own product list, not via bootstrap");
});
