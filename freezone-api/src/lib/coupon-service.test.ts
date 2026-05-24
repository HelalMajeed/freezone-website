import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDiscountForCoupon, validateCouponRecord, type Coupon } from "./coupon-service";

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 1,
    code: "SAVE",
    active: true,
    discountType: "percent",
    discountValue: 10,
    minSubtotal: 0,
    usageLimit: null,
    usedCount: 0,
    startsAt: null,
    endsAt: null,
    ...overrides,
  };
}

// --- computeDiscountForCoupon ---

test("percent discount floors the result", () => {
  assert.equal(computeDiscountForCoupon(coupon({ discountValue: 10 }), 12345), 1234);
});

test("percent clamps above 100 to 100", () => {
  assert.equal(computeDiscountForCoupon(coupon({ discountValue: 150 }), 1000), 1000);
});

test("percent clamps negative to 0", () => {
  assert.equal(computeDiscountForCoupon(coupon({ discountValue: -5 }), 1000), 0);
});

test("fixed_iqd returns the fixed amount", () => {
  assert.equal(
    computeDiscountForCoupon(coupon({ discountType: "fixed_iqd", discountValue: 5000 }), 20000),
    5000,
  );
});

test("fixed_iqd never exceeds the subtotal", () => {
  assert.equal(
    computeDiscountForCoupon(coupon({ discountType: "fixed_iqd", discountValue: 99999 }), 8000),
    8000,
  );
});

test("fixed_iqd clamps negative to 0", () => {
  assert.equal(
    computeDiscountForCoupon(coupon({ discountType: "fixed_iqd", discountValue: -100 }), 8000),
    0,
  );
});

// --- validateCouponRecord ---

test("null coupon → invalid", () => {
  const r = validateCouponRecord(null, 10000);
  assert.equal(r.ok, false);
});

test("inactive coupon → rejected", () => {
  const r = validateCouponRecord(coupon({ active: false }), 10000);
  assert.equal(r.ok, false);
});

test("before startsAt → out of window", () => {
  const future = new Date(Date.now() + 86_400_000);
  const r = validateCouponRecord(coupon({ startsAt: future }), 10000);
  assert.equal(r.ok, false);
});

test("after endsAt → out of window", () => {
  const past = new Date(Date.now() - 86_400_000);
  const r = validateCouponRecord(coupon({ endsAt: past }), 10000);
  assert.equal(r.ok, false);
});

test("subtotal below minSubtotal → rejected", () => {
  const r = validateCouponRecord(coupon({ minSubtotal: 50000 }), 10000);
  assert.equal(r.ok, false);
});

test("usage limit reached → rejected", () => {
  const r = validateCouponRecord(coupon({ usageLimit: 5, usedCount: 5 }), 10000);
  assert.equal(r.ok, false);
});

test("usage under limit → allowed", () => {
  const r = validateCouponRecord(coupon({ usageLimit: 5, usedCount: 4, discountValue: 10 }), 10000);
  assert.equal(r.ok, true);
});

test("discount that computes to 0 → rejected", () => {
  /** 10% of 5 IQD floors to 0. */
  const r = validateCouponRecord(coupon({ discountValue: 10 }), 5);
  assert.equal(r.ok, false);
});

test("valid coupon returns discount + id + code", () => {
  const r = validateCouponRecord(coupon({ id: 7, code: "TEN", discountValue: 10 }), 100000);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.discount, 10000);
    assert.equal(r.couponId, 7);
    assert.equal(r.code, "TEN");
  }
});

test("active window with both bounds, now inside → allowed", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  const r = validateCouponRecord(
    coupon({
      startsAt: new Date("2026-05-01T00:00:00Z"),
      endsAt: new Date("2026-07-01T00:00:00Z"),
      discountValue: 20,
    }),
    50000,
    now,
  );
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.discount, 10000);
});
