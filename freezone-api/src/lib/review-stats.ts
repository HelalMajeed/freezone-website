import type { Prisma } from "@prisma/client";

/**
 * Customer-review denormalization — single owner of the recompute rule
 * (API_CONTRACT §4): whenever a Review is approved / unapproved / deleted,
 * `Product.rating` and `Product.reviews` must be refreshed **inside the same
 * transaction** as the mutation so the storefront never reads a half-updated
 * pair.
 *
 * Rules:
 *  - `Product.reviews` = count of approved reviews.
 *  - `Product.rating`  = average rating of approved reviews, rounded to one
 *    decimal. When zero reviews are approved the existing rating is KEPT
 *    (products ship with a default display rating; dropping to 0 would punish
 *    a product whose only review was retracted).
 */

/**
 * Pure mapping from the approved-review aggregate to the `Product.update`
 * data patch. Exported separately so the rounding/keep-existing rules are
 * unit-testable without a database.
 */
export function reviewStatsUpdate(
  approvedCount: number,
  approvedAvg: number | null | undefined,
): { reviews: number; rating?: number } {
  if (approvedCount <= 0 || approvedAvg == null) {
    // Keep the existing Product.rating — only the counter resets.
    return { reviews: 0 };
  }
  return { reviews: approvedCount, rating: Math.round(approvedAvg * 10) / 10 };
}

/**
 * Recompute and persist the product's review stats. MUST be called with the
 * transaction client of the surrounding review mutation.
 */
export async function recomputeProductReviewStats(
  tx: Prisma.TransactionClient,
  productId: number,
): Promise<{ reviews: number; rating?: number }> {
  const agg = await tx.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const data = reviewStatsUpdate(agg._count._all, agg._avg.rating);
  await tx.product.update({ where: { id: productId }, data });
  return data;
}
