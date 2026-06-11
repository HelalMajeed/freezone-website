import { test } from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { recomputeProductReviewStats, reviewStatsUpdate } from "./review-stats";

// --- reviewStatsUpdate: pure rounding / keep-existing rules ---

test("rounds the approved average to one decimal", () => {
  assert.deepEqual(reviewStatsUpdate(3, 4.3333333), { reviews: 3, rating: 4.3 });
  assert.deepEqual(reviewStatsUpdate(2, 4.55), { reviews: 2, rating: 4.6 });
  assert.deepEqual(reviewStatsUpdate(1, 5), { reviews: 1, rating: 5 });
});

test("keeps the existing rating when zero reviews are approved", () => {
  // No `rating` key at all — Prisma must not touch the column.
  assert.deepEqual(reviewStatsUpdate(0, null), { reviews: 0 });
  assert.equal("rating" in reviewStatsUpdate(0, null), false);
});

test("treats a null average defensively even with a positive count", () => {
  assert.deepEqual(reviewStatsUpdate(2, null), { reviews: 0 });
});

// --- recomputeProductReviewStats: aggregate → product.update wiring ---

type AggregateArgs = {
  where: { productId: number; isApproved: boolean };
};

function fakeTx(approvedCount: number, approvedAvg: number | null) {
  const calls: { aggregate: AggregateArgs[]; update: unknown[] } = { aggregate: [], update: [] };
  const tx = {
    review: {
      aggregate: async (args: AggregateArgs) => {
        calls.aggregate.push(args);
        return { _avg: { rating: approvedAvg }, _count: { _all: approvedCount } };
      },
    },
    product: {
      update: async (args: unknown) => {
        calls.update.push(args);
        return {};
      },
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, calls };
}

test("recompute aggregates approved reviews only and persists the patch", async () => {
  const { tx, calls } = fakeTx(4, 3.875);
  const result = await recomputeProductReviewStats(tx, 42);

  assert.deepEqual(result, { reviews: 4, rating: 3.9 });
  assert.equal(calls.aggregate.length, 1);
  assert.deepEqual(calls.aggregate[0].where, { productId: 42, isApproved: true });
  assert.deepEqual(calls.update, [
    { where: { id: 42 }, data: { reviews: 4, rating: 3.9 } },
  ]);
});

test("recompute with zero approved reviews resets the counter but not the rating", async () => {
  const { tx, calls } = fakeTx(0, null);
  const result = await recomputeProductReviewStats(tx, 7);

  assert.deepEqual(result, { reviews: 0 });
  assert.deepEqual(calls.update, [{ where: { id: 7 }, data: { reviews: 0 } }]);
});
