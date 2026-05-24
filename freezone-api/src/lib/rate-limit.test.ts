import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rateLimitCheck, resetRateLimitStore } from "./rate-limit";

beforeEach(() => resetRateLimitStore());

test("allows requests under the limit", () => {
  for (let i = 0; i < 5; i += 1) {
    const r = rateLimitCheck("orders", "1.2.3.4", 5, 60_000);
    assert.ok(r.ok, `request #${i + 1} should be allowed`);
  }
});

test("blocks the (limit + 1)th request and reports retryAfterMs", () => {
  for (let i = 0; i < 5; i += 1) rateLimitCheck("orders", "1.2.3.4", 5, 60_000);
  const r = rateLimitCheck("orders", "1.2.3.4", 5, 60_000);
  assert.equal(r.ok, false);
  assert.ok(typeof r.retryAfterMs === "number" && r.retryAfterMs > 0);
});

test("buckets per IP — different keys do not share counters", () => {
  for (let i = 0; i < 5; i += 1) rateLimitCheck("orders", "a", 5, 60_000);
  const blocked = rateLimitCheck("orders", "a", 5, 60_000);
  assert.equal(blocked.ok, false);
  const otherIp = rateLimitCheck("orders", "b", 5, 60_000);
  assert.equal(otherIp.ok, true);
});

test("buckets per scope — different endpoints do not share counters", () => {
  for (let i = 0; i < 5; i += 1) rateLimitCheck("orders", "1.2.3.4", 5, 60_000);
  const blocked = rateLimitCheck("orders", "1.2.3.4", 5, 60_000);
  assert.equal(blocked.ok, false);
  const otherScope = rateLimitCheck("coupons", "1.2.3.4", 5, 60_000);
  assert.equal(otherScope.ok, true);
});

test("remaining counter decreases monotonically until limit", () => {
  const before = rateLimitCheck("x", "k", 3, 60_000);
  assert.equal(before.remaining, 2);
  const mid = rateLimitCheck("x", "k", 3, 60_000);
  assert.equal(mid.remaining, 1);
  const last = rateLimitCheck("x", "k", 3, 60_000);
  assert.equal(last.remaining, 0);
});

test("window expiry frees slots once entries roll out", async () => {
  for (let i = 0; i < 3; i += 1) rateLimitCheck("burst", "k", 3, 20);
  assert.equal(rateLimitCheck("burst", "k", 3, 20).ok, false);
  await new Promise((r) => setTimeout(r, 35));
  assert.equal(rateLimitCheck("burst", "k", 3, 20).ok, true);
});
