// Category lookup for the importer.
//
// Sprint 0 only owns the stable `needs-review` fallback. Sprint 1 will add
// product_type/vendor → existing-category matching on top of this.

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const NEEDS_REVIEW_SLUG = "needs-review";

type Db = PrismaClient | typeof prisma;

/**
 * Find-or-create the `needs-review` category. Idempotent + safe to call
 * concurrently — the slug is unique so the second writer hits a constraint
 * collision and the first writer wins.
 */
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
