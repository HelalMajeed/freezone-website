// Resolve the FreeZone category for an imported product.
//
//   Phase 1 will add smart `product_type`/`vendor` → existing-category matching.
//   For Phase 0 this only owns the "Needs review" fallback: a single category with
//   the fixed slug `needs-review` that receives every imported product until a
//   better classifier is wired up.
//
//   Stable-slug guarantee: we look up + create through Prisma so the row's `slug`
//   is exactly `needs-review` — no timestamp suffix, no slugify drift from the
//   admin POST endpoint.

export const NEEDS_REVIEW_SLUG = "needs-review";

/**
 * Returns the `Category` row for `needs-review`, creating it on first call.
 * Idempotent: safe to call concurrently and on every batch run.
 */
export async function ensureNeedsReviewCategory(prisma) {
  const existing = await prisma.category.findUnique({ where: { slug: NEEDS_REVIEW_SLUG } });
  if (existing) return existing;
  return await prisma.category.create({
    data: {
      slug: NEEDS_REVIEW_SLUG,
      nameEn: "Needs review",
      nameAr: "بحاجة مراجعة",
      active: true,
      sortOrder: 9999,
    },
  });
}

/**
 * Remove staging-imports-* leftover categories that have **zero products** linked.
 * Refuses to touch any other category, and refuses if a target has products.
 *
 * Returns `{ inspected, deleted: [{id, slug}], skipped: [{id, slug, reason}] }`.
 */
export async function cleanupOrphanStagingCategories(prisma) {
  const candidates = await prisma.category.findMany({
    where: { slug: { startsWith: "staging-imports" } },
    select: { id: true, slug: true, nameEn: true, _count: { select: { products: true, secondaryProductLinks: true } } },
  });
  const deleted = [];
  const skipped = [];
  for (const c of candidates) {
    const productCount = c._count.products + c._count.secondaryProductLinks;
    if (productCount > 0) {
      skipped.push({ id: c.id, slug: c.slug, reason: `has ${productCount} product link(s)` });
      continue;
    }
    await prisma.category.delete({ where: { id: c.id } });
    deleted.push({ id: c.id, slug: c.slug });
  }
  return { inspected: candidates.length, deleted, skipped };
}
