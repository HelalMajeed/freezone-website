import { test } from "node:test";
import assert from "node:assert/strict";
import { absolutizeUploadUrl } from "./catalog";

/**
 * Outside production with no PUBLIC_UPLOADS_ORIGIN, /uploads paths stay
 * RELATIVE (the Vite dev proxy serves them); in production the default origin
 * is https://freezone-website.fly.dev. The origin is resolved at module load,
 * so this test asserts the non-production (test-runner) behavior.
 */
test("relative /uploads path stays relative outside production", () => {
  assert.equal(
    absolutizeUploadUrl("/uploads/products/2026/05/x.webp"),
    "/uploads/products/2026/05/x.webp",
  );
});

test("already-absolute http(s) URL is untouched", () => {
  const cdn = "https://cdn.shopify.com/s/files/x.jpg";
  assert.equal(absolutizeUploadUrl(cdn), cdn);
  const hik = "https://assets.hikvision.com/y.png";
  assert.equal(absolutizeUploadUrl(hik), hik);
});

test("non-uploads relative path is left as-is", () => {
  assert.equal(absolutizeUploadUrl("/brands/asus.svg"), "/brands/asus.svg");
});

test("empty string returns empty", () => {
  assert.equal(absolutizeUploadUrl(""), "");
});
