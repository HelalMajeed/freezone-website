import { describe, expect, it } from "vitest";
import { computeCartTotals, computeCheckoutTotals, type CartItem } from "./store";

function item(id: number, price: number, qty: number): CartItem {
  return { id, price, qty } as CartItem;
}

describe("computeCartTotals", () => {
  it("returns zeros for an empty cart at/above the free-delivery threshold", () => {
    expect(computeCartTotals([], 0, 10, 0)).toEqual({
      subtotal: 0,
      afterDiscount: 0,
      shipping: 0,
      grandTotal: 0,
      couponDiscount: 0,
    });
  });

  it("sums price * qty across items", () => {
    const r = computeCartTotals([item(1, 50, 2), item(2, 30, 1)], 1000, 10, 0);
    expect(r.subtotal).toBe(130);
    expect(r.afterDiscount).toBe(130);
  });

  it("floors the discounted amount to 0 when discount exceeds subtotal", () => {
    const r = computeCartTotals([item(1, 40, 1)], 1000, 10, 100);
    expect(r.afterDiscount).toBe(0);
    expect(r.grandTotal).toBe(10); // shipping still applies below threshold
  });

  it("charges standard shipping below the free-delivery threshold", () => {
    const r = computeCartTotals([item(1, 50, 1)], 100, 15, 0);
    expect(r.shipping).toBe(15);
    expect(r.grandTotal).toBe(65);
  });

  it("waives shipping at the free-delivery threshold", () => {
    const r = computeCartTotals([item(1, 100, 1)], 100, 15, 0);
    expect(r.shipping).toBe(0);
    expect(r.grandTotal).toBe(100);
  });

  it("waives shipping above the free-delivery threshold", () => {
    const r = computeCartTotals([item(1, 250, 1)], 100, 15, 0);
    expect(r.shipping).toBe(0);
    expect(r.grandTotal).toBe(250);
  });

  it("evaluates the free-delivery threshold against the discounted subtotal", () => {
    // subtotal 110, discount 20 -> 90 which is below the 100 threshold
    const r = computeCartTotals([item(1, 110, 1)], 100, 15, 20);
    expect(r.afterDiscount).toBe(90);
    expect(r.shipping).toBe(15);
    expect(r.grandTotal).toBe(105);
  });
});

describe("computeCheckoutTotals", () => {
  it("returns zeros for an empty pickup cart", () => {
    expect(
      computeCheckoutTotals([], { pickup: true, threshold: 100, shipFee: 10, couponDiscount: 0 }),
    ).toEqual({ subtotal: 0, afterDiscount: 0, shipping: 0, grandTotal: 0 });
  });

  it("forces shipping to 0 for pickup even below the threshold", () => {
    const r = computeCheckoutTotals([item(1, 20, 1)], {
      pickup: true,
      threshold: 100,
      shipFee: 15,
      couponDiscount: 0,
    });
    expect(r.shipping).toBe(0);
    expect(r.grandTotal).toBe(20);
  });

  it("charges shipping for delivery below the threshold", () => {
    const r = computeCheckoutTotals([item(1, 20, 1)], {
      pickup: false,
      threshold: 100,
      shipFee: 15,
      couponDiscount: 0,
    });
    expect(r.shipping).toBe(15);
    expect(r.grandTotal).toBe(35);
  });

  it("waives delivery shipping at/above the threshold", () => {
    const r = computeCheckoutTotals([item(1, 100, 1)], {
      pickup: false,
      threshold: 100,
      shipFee: 15,
      couponDiscount: 0,
    });
    expect(r.shipping).toBe(0);
    expect(r.grandTotal).toBe(100);
  });

  it("floors the discounted amount to 0 when discount exceeds subtotal", () => {
    const r = computeCheckoutTotals([item(1, 40, 1)], {
      pickup: true,
      threshold: 100,
      shipFee: 15,
      couponDiscount: 100,
    });
    expect(r.afterDiscount).toBe(0);
    expect(r.grandTotal).toBe(0);
  });
});
