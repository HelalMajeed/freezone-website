import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAllowedOriginMatcher, shouldRejectMutationOrigin } from "./csrf-origin";

// SEC-4 (docs/ENTERPRISE_GAP_AUDIT.md): admin/dashboard mutations from an
// untrusted Origin must be rejected, while legitimate origins and no-Origin
// server-to-server calls pass. The matcher must equal the CORS allow-list.

test("default allow-list matches prod + netlify preview + localhost, rejects others", () => {
  const ok = buildAllowedOriginMatcher(undefined);
  assert.equal(ok("https://freezone-iq.com"), true);
  assert.equal(ok("https://freezone-website.fly.dev"), true);
  assert.equal(ok("https://deploy-preview-61--freezone-web.netlify.app"), true);
  assert.equal(ok("http://localhost:3000"), true);
  assert.equal(ok("http://127.0.0.1:3000"), true);
  assert.equal(ok("https://evil.com"), false);
  assert.equal(ok("https://freezone-iq.com.evil.com"), false);
});

test("CORS_ORIGINS override is honored (exact + regex entries)", () => {
  const ok = buildAllowedOriginMatcher("https://a.example, ^https://[a-z]+\\.b\\.example$");
  assert.equal(ok("https://a.example"), true);
  assert.equal(ok("https://x.b.example"), true);
  assert.equal(ok("https://freezone-iq.com"), false);
});

const ok = buildAllowedOriginMatcher(undefined);

test("rejects cross-origin forgery on admin/dashboard mutations", () => {
  assert.equal(shouldRejectMutationOrigin("POST", "/api/admin/products/bulk", "https://evil.com", ok), true);
  assert.equal(shouldRejectMutationOrigin("PATCH", "/api/admin/orders/5", "https://evil.com", ok), true);
  assert.equal(shouldRejectMutationOrigin("DELETE", "/api/dashboard/users/1", "https://evil.com", ok), true);
});

test("allows legitimate admin origins and no-Origin server-to-server calls", () => {
  assert.equal(shouldRejectMutationOrigin("POST", "/api/admin/products/bulk", "https://freezone-iq.com", ok), false);
  assert.equal(shouldRejectMutationOrigin("DELETE", "/api/dashboard/users/1", "https://freezone-iq.com", ok), false);
  assert.equal(shouldRejectMutationOrigin("POST", "/api/admin/products/bulk", undefined, ok), false);
  assert.equal(shouldRejectMutationOrigin("POST", "/api/admin/products/bulk", null, ok), false);
});

test("ignores safe methods, non-admin paths, and preflight", () => {
  assert.equal(shouldRejectMutationOrigin("GET", "/api/admin/products", "https://evil.com", ok), false);
  assert.equal(shouldRejectMutationOrigin("OPTIONS", "/api/admin/products/bulk", "https://evil.com", ok), false);
  // public/ssr storefront surface is intentionally out of this guard's scope
  assert.equal(shouldRejectMutationOrigin("POST", "/api/public/orders", "https://evil.com", ok), false);
});
