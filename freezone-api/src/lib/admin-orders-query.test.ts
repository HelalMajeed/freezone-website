import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ORDER_STATUSES,
  isAllowedOrderTransition,
  isOrderStatus,
  type OrderStatus,
} from "./admin-orders-query";

// --- isAllowedOrderTransition: legal forward moves ---

const LEGAL: Array<[OrderStatus, OrderStatus]> = [
  ["pending", "confirmed"],
  ["pending", "processing"],
  ["pending", "shipped"],
  ["pending", "delivered"],
  ["confirmed", "processing"],
  ["confirmed", "shipped"],
  ["confirmed", "delivered"],
  ["processing", "shipped"],
  ["processing", "delivered"],
  ["shipped", "delivered"],
];

for (const [from, to] of LEGAL) {
  test(`allows legal transition ${from} -> ${to}`, () => {
    assert.equal(isAllowedOrderTransition(from, to), true);
  });
}

// --- same-status no-op is always allowed (idempotent re-set must not 409) ---

for (const status of ORDER_STATUSES) {
  test(`allows same-status no-op ${status} -> ${status}`, () => {
    assert.equal(isAllowedOrderTransition(status, status), true);
  });
}

// --- terminal states have no outgoing transitions ---

test("delivered cannot move to any other status", () => {
  for (const to of ORDER_STATUSES) {
    if (to === "delivered") continue;
    assert.equal(
      isAllowedOrderTransition("delivered", to),
      false,
      `delivered -> ${to} must be rejected`,
    );
  }
});

test("cancelled cannot move to any other status", () => {
  for (const to of ORDER_STATUSES) {
    if (to === "cancelled") continue;
    assert.equal(
      isAllowedOrderTransition("cancelled", to),
      false,
      `cancelled -> ${to} must be rejected`,
    );
  }
});

// --- cancellation is never reachable via PATCH (it must go through the cancel route) ---

test("no status can transition into cancelled via the state machine", () => {
  for (const from of ORDER_STATUSES) {
    if (from === "cancelled") continue;
    assert.equal(
      isAllowedOrderTransition(from, "cancelled"),
      false,
      `${from} -> cancelled must be rejected`,
    );
  }
});

// --- specific dangerous backward / reopen moves stay rejected ---

test("rejects backward and reopen moves", () => {
  assert.equal(isAllowedOrderTransition("delivered", "pending"), false);
  assert.equal(isAllowedOrderTransition("delivered", "shipped"), false);
  assert.equal(isAllowedOrderTransition("shipped", "processing"), false);
  assert.equal(isAllowedOrderTransition("shipped", "pending"), false);
  assert.equal(isAllowedOrderTransition("processing", "confirmed"), false);
  assert.equal(isAllowedOrderTransition("confirmed", "pending"), false);
});

// --- isOrderStatus type guard ---

test("isOrderStatus accepts known statuses and rejects junk", () => {
  assert.equal(isOrderStatus("pending"), true);
  assert.equal(isOrderStatus("delivered"), true);
  assert.equal(isOrderStatus("refunded"), false);
  assert.equal(isOrderStatus(""), false);
  assert.equal(isOrderStatus(null), false);
  assert.equal(isOrderStatus(42), false);
});
