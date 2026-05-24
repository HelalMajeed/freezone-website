// Category lookup for the importer.
//
// Sprint 0 owned the stable `needs-review` fallback. Sprint 1 adds the smart
// `pickCategorySlug` → existing-category matcher on top: imported products
// land in `accessories` / `components` / `monitors` / etc. when Shopify's
// product_type and vendor + the product title give us enough signal, and the
// `needs-review` bucket is reserved for genuinely unclassifiable rows.

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pickCategorySlug, type CategoryHint } from "./resolve-category";

export const NEEDS_REVIEW_SLUG = "needs-review";

type Db = PrismaClient | typeof prisma;

/**
 * Find-or-create the `needs-review` category. Idempotent + safe to call
 * concurrently — the slug is unique so the second writer hits a constraint
 * collision and the first writer wins.
 */
/**
 * Pick the FreeZone category that should own a Shopify-imported product.
 *
 *   1. Run `pickCategorySlug` on the (product_type, vendor, title) triple.
 *   2. If a slug came back, look it up in the DB. Return the row if `active`.
 *   3. Otherwise fall back to `ensureNeedsReviewCategory`.
 *
 * Returns `{ category, matchedSlug }` so the caller can report whether the
 * smart match worked or the fallback was used.
 */
export async function resolveCategoryForImport(
  hint: CategoryHint,
  db: Db = prisma,
): Promise<{ category: { id: number; slug: string }; matchedSlug: string | null }> {
  const slug = pickCategorySlug(hint);
  if (slug) {
    const row = await db.category.findUnique({ where: { slug }, select: { id: true, slug: true, active: true } });
    if (row?.active) {
      return { category: { id: row.id, slug: row.slug }, matchedSlug: slug };
    }
  }
  const fallback = await ensureNeedsReviewCategory(db);
  return { category: { id: fallback.id, slug: fallback.slug }, matchedSlug: null };
}

export async function ensureNeedsReviewCategory(db: Db = prisma) {
  const existing = await db.category.findUnique({ where: { slug: NEEDS_REVIEW_SLUG } });
  if (existing) return existing;
  try {
    return await db.category.create({
      data: {
        slug: NEEDS_REVIEW_SLUG,
        nameEn: "Needs review",
        nameAr: "بحاجة مراجعة",
        active: true,
        sortOrder: 9999,
      },
    });
  } catch {
    /** Race: another worker just created it — return that row. */
    const row = await db.category.findUnique({ where: { slug: NEEDS_REVIEW_SLUG } });
    if (!row) throw new Error("needs-review category disappeared between create and find");
    return row;
  }
}
