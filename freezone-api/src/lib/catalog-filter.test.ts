import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCatalogOrderBy, parseCatalogFilterFromUrl } from "./catalog-filter";

/**
 * buildCatalogOrderBy is the cross-page sort fix: the DB path must order in
 * SQL (page 2 of "price-asc" may not contain items cheaper than page 1).
 */

test("price sorts order by price with stable id tiebreaker", () => {
  assert.deepEqual(buildCatalogOrderBy("price-asc", false, "en"), [
    { price: "asc" },
    { id: "desc" },
  ]);
  assert.deepEqual(buildCatalogOrderBy("price-desc", false, "en"), [
    { price: "desc" },
    { id: "desc" },
  ]);
});

test("date sorts map to id ordering", () => {
  assert.deepEqual(buildCatalogOrderBy("date-new", false, "en"), [{ id: "desc" }]);
  assert.deepEqual(buildCatalogOrderBy("date-old", false, "en"), [{ id: "asc" }]);
});

test("featured sort keeps the legacy featured/id ordering", () => {
  assert.deepEqual(buildCatalogOrderBy("featured", false, "en"), [
    { featured: "desc" },
    { id: "desc" },
  ]);
});

test("relevant sorts alphabetically on the locale's name column", () => {
  assert.deepEqual(buildCatalogOrderBy("relevant", false, "en"), [
    { nameEn: "asc" },
    { id: "desc" },
  ]);
  assert.deepEqual(buildCatalogOrderBy("relevant", false, "ar"), [
    { nameAr: "asc" },
    { id: "desc" },
  ]);
});

test("default is featured without a query, relevant with one", () => {
  assert.deepEqual(buildCatalogOrderBy(undefined, false, "en"), [
    { featured: "desc" },
    { id: "desc" },
  ]);
  assert.deepEqual(buildCatalogOrderBy(undefined, true, "en"), [
    { nameEn: "asc" },
    { id: "desc" },
  ]);
});

test("parseCatalogFilterFromUrl accepts known sort values and drops unknown ones", () => {
  const base = "http://localhost/api/ssr/catalog/products";
  assert.equal(parseCatalogFilterFromUrl(`${base}?sort=price-asc`).sort, "price-asc");
  assert.equal(parseCatalogFilterFromUrl(`${base}?sort=date-old`).sort, "date-old");
  assert.equal(parseCatalogFilterFromUrl(`${base}?sort=bogus`).sort, undefined);
  assert.equal(parseCatalogFilterFromUrl(base).sort, undefined);
});

test("best-selling sort is accepted and orders by sales → reviews → id", () => {
  const base = "http://localhost/api/ssr/catalog/products";
  assert.equal(parseCatalogFilterFromUrl(`${base}?sort=best-selling`).sort, "best-selling");
  assert.deepEqual(buildCatalogOrderBy("best-selling", false, "en"), [
    { sales: "desc" },
    { reviews: "desc" },
    { id: "desc" },
  ]);
});

/**
 * pageSize clamp is the safeguard that keeps the listing server-paginated: even
 * with the full catalog removed from bootstrap, an unclamped ?pageSize could let
 * the browser pull the whole catalog through the products endpoint in one page.
 */
test("pageSize is clamped to [1,100] with a default of 48", () => {
  const base = "http://localhost/api/ssr/catalog/products";
  assert.equal(parseCatalogFilterFromUrl(base).pageSize, 48);
  assert.equal(parseCatalogFilterFromUrl(`${base}?pageSize=24`).pageSize, 24);
  assert.equal(parseCatalogFilterFromUrl(`${base}?pageSize=100000`).pageSize, 100);
  // 0 and non-numeric fall back to the default (falsy → `|| 48`); negatives floor to 1.
  assert.equal(parseCatalogFilterFromUrl(`${base}?pageSize=0`).pageSize, 48);
  assert.equal(parseCatalogFilterFromUrl(`${base}?pageSize=-5`).pageSize, 1);
  assert.equal(parseCatalogFilterFromUrl(`${base}?pageSize=abc`).pageSize, 48);
});

test("page is floored to 1", () => {
  const base = "http://localhost/api/ssr/catalog/products";
  assert.equal(parseCatalogFilterFromUrl(base).page, 1);
  assert.equal(parseCatalogFilterFromUrl(`${base}?page=3`).page, 3);
  assert.equal(parseCatalogFilterFromUrl(`${base}?page=0`).page, 1);
  assert.equal(parseCatalogFilterFromUrl(`${base}?page=-2`).page, 1);
  assert.equal(parseCatalogFilterFromUrl(`${base}?page=abc`).page, 1);
});
