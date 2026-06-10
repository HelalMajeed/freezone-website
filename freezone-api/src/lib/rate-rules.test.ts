import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRateLimitRule } from "./rate-rules";

test("exact rules: existing per-route limits resolve unchanged", () => {
  assert.deepEqual(resolveRateLimitRule("POST", "/api/public/orders"), {
    scope: "public/orders",
    limit: 5,
    windowMs: 60_000,
  });
  assert.equal(resolveRateLimitRule("POST", "/api/dashboard/auth/login")?.scope, "dashboard/login");
  assert.equal(resolveRateLimitRule("POST", "/api/public/contact")?.limit, 5);
});

test("exact rules: case and trailing-slash variants hit the same rule", () => {
  const canonical = resolveRateLimitRule("POST", "/api/public/contact");
  assert.deepEqual(resolveRateLimitRule("post", "/API/Public/Contact/"), canonical);
  assert.deepEqual(resolveRateLimitRule("POST", "/api/public/contact///"), canonical);
});

test("customer auth register/login mirror the dashboard login budget", () => {
  for (const path of ["/api/public/auth/register", "/api/public/auth/login"]) {
    const rule = resolveRateLimitRule("POST", path);
    assert.ok(rule, `${path} must be throttled`);
    assert.equal(rule.limit, 5);
    assert.equal(rule.windowMs, 10 * 60_000);
  }
});

test("pattern rule: review submission matches any product id", () => {
  for (const path of [
    "/api/public/products/194/reviews",
    "/api/public/products/abc/reviews/",
    "/API/public/products/9999/REVIEWS",
  ]) {
    const rule = resolveRateLimitRule("POST", path);
    assert.equal(rule?.scope, "public/product-reviews", path);
    assert.equal(rule?.limit, 5);
    assert.equal(rule?.windowMs, 60_000);
  }
});

test("pattern rule: does not over-match deeper or shallower paths", () => {
  assert.notEqual(resolveRateLimitRule("POST", "/api/public/products/reviews")?.scope, "public/product-reviews");
  assert.notEqual(resolveRateLimitRule("POST", "/api/public/products/1/2/reviews")?.scope, "public/product-reviews");
  // GETs of the same path are read traffic, not submissions
  assert.notEqual(resolveRateLimitRule("GET", "/api/public/products/194/reviews")?.scope, "public/product-reviews");
});

test("fallback: public/ssr GETs get the generous baseline", () => {
  for (const path of [
    "/api/public/site",
    "/api/public/search-suggestions",
    "/api/ssr/storefront-bootstrap",
    "/api/ssr/product/194",
    "/api/public/products/194/reviews", // GET reads fall through to baseline
  ]) {
    const rule = resolveRateLimitRule("GET", path);
    assert.equal(rule?.scope, "public/get-baseline", path);
    assert.equal(rule?.limit, 300);
    assert.equal(rule?.windowMs, 60_000);
  }
  assert.equal(resolveRateLimitRule("HEAD", "/api/public/site")?.scope, "public/get-baseline");
});

test("fallback: never throttles admin/dashboard GETs, uploads, health, or POSTs", () => {
  assert.equal(resolveRateLimitRule("GET", "/api/admin/products"), null);
  assert.equal(resolveRateLimitRule("GET", "/api/dashboard/overview"), null);
  assert.equal(resolveRateLimitRule("GET", "/uploads/products/x.webp"), null);
  assert.equal(resolveRateLimitRule("GET", "/health"), null);
  assert.equal(resolveRateLimitRule("GET", "/"), null);
  // unmatched POSTs stay unthrottled (handlers enforce their own validation)
  assert.equal(resolveRateLimitRule("POST", "/api/public/auth/logout"), null);
});
