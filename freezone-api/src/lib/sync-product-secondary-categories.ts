import { prisma } from "./prisma";

/**
 * Replace secondary category links. Never stores the primary category id in the join table.
 */
export async function replaceProductSecondaryCategories(
  productId: number,
  primaryCategoryId: number,
  secondaryCategoryIds: number[] | undefined | null,
): Promise<void> {
  const raw = secondaryCategoryIds ?? [];
  const unique = [...new Set(raw.filter((n) => Number.isFinite(n) && n > 0))].filter((id) => id !== primaryCategoryId);

  await prisma.$transaction([
    prisma.productSecondaryCategory.deleteMany({ where: { productId } }),
    ...(unique.length
      ? [
          prisma.productSecondaryCategory.createMany({
            data: unique.map((categoryId) => ({ productId, categoryId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
}

/** Remove join rows that duplicate the product’s current primary category. */
export async function stripSecondaryMatchingPrimary(productId: number, primaryCategoryId: number): Promise<void> {
  await prisma.productSecondaryCategory.deleteMany({
    where: { productId, categoryId: primaryCategoryId },
  });
}
