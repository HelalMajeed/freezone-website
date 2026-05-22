import type { PrismaClient } from "@prisma/client";
import { getCategoryFilterSchema, resolveCategorySchemaSlug } from "./category-filter-schema";
import { categoryAttributeRowsToFacetDefs, syncCategoryAttributesFromFacetKeys } from "./sync";
import type { CategoryAttributeRow } from "./types";

/**
 * Upsert missing preset attributes for a category (does not delete products or values).
 */
export async function ensureCategorySchemaComplete(
  prisma: PrismaClient,
  categoryId: number,
  slug: string,
  rows: CategoryAttributeRow[],
): Promise<CategoryAttributeRow[]> {
  const canonical = resolveCategorySchemaSlug(slug);
  const preset = getCategoryFilterSchema(canonical);
  if (!preset.length) return rows;

  const existing = new Set(rows.map((r) => r.key));
  const missing = preset.filter((p) => !existing.has(p.key));
  if (!missing.length) return rows;

  const merged = [...categoryAttributeRowsToFacetDefs(rows), ...missing];
  return syncCategoryAttributesFromFacetKeys(prisma, categoryId, merged);
}
