import { test } from "node:test";
import assert from "node:assert/strict";
import { absolutizeUploadUrl } from "./catalog";

const ORIGIN = "https://freezone-website.fly.dev";

test("relative /uploads path becomes absolute on the API origin", () => {
  assert.equal(
    absolutizeUploadUrl("/uploads/products/2026/05/x.webp"),
    `${ORIGIN}/uploads/products/2026/05/x.webp`,
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
