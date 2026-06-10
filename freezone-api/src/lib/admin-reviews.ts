import type { Review } from "@prisma/client";

/**
 * Shared serialization for the customer-review moderation endpoints
 * (`/api/admin/reviews` list + `/api/admin/reviews/:id` mutations) so both
 * return the exact same row shape (API_CONTRACT §4).
 */

export const REVIEW_PRODUCT_SELECT = {
  select: { id: true, slug: true, nameEn: true, nameAr: true },
} as const;

export type ReviewWithProduct = Review & {
  product: { id: number; slug: string | null; nameEn: string; nameAr: string } | null;
};

export function serializeReview(r: ReviewWithProduct) {
  return {
    id: r.id,
    productId: r.productId,
    customerId: r.customerId,
    customerName: r.customerName,
    /** Moderation-only — never exposed on public review endpoints. */
    phone: r.phone,
    rating: r.rating,
    comment: r.comment,
    isApproved: r.isApproved,
    createdAt: r.createdAt.toISOString(),
    product: r.product
      ? { id: r.product.id, slug: r.product.slug, nameEn: r.product.nameEn, nameAr: r.product.nameAr }
      : null,
  };
}
