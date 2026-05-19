import type { PrismaClient } from "@prisma/client";
import { CLASSIFICATION_SEED_BY_SLUG } from "./seed-presets";
import { syncCategoryAttributesFromFacetKeys } from "./sync";
import type { CategoryAttributeRow } from "./types";

/**
 * Ensure category has full classification schema (upsert). Does not delete products.
 */
export async function ensureCategorySchemaComplete(
  prisma: PrismaClient,
  categoryId: number,
  slug: string,
  rows: CategoryAttributeRow[],
): Promise<CategoryAttributeRow[]> {
  const preset = CLASSIFICATION_SEED_BY_SLUG[slug];
  if (!preset?.length) return rows;
  if (rows.length >= preset.length) return rows;
  return syncCategoryAttributesFromFacetKeys(prisma, categoryId, preset);
}
