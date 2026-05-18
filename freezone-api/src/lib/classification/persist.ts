import type { Prisma } from "@prisma/client";
import type { ProductAttributeValueRow } from "./types";
import { validateProductSpecsAgainstSchema, validationErrorMessage } from "./validate";
import type { CategoryAttributeRow } from "./types";

type ProductAttrPrisma = {
  productAttributeValue: {
    deleteMany: (args: { where: { productId: number } }) => Promise<unknown>;
    createMany: (args: { data: Prisma.ProductAttributeValueCreateManyInput[] }) => Promise<unknown>;
  };
};

export async function loadCategoryAttributeSchema(
  findMany: (args: {
    where: { categoryId: number };
    orderBy: { sortOrder: "asc" };
  }) => Promise<CategoryAttributeRow[]>,
  categoryId: number,
): Promise<CategoryAttributeRow[]> {
  return findMany({ where: { categoryId }, orderBy: { sortOrder: "asc" } });
}

export async function saveProductSpecsNormalized(
  prisma: ProductAttrPrisma,
  productId: number,
  schema: CategoryAttributeRow[],
  specsInput: unknown,
): Promise<{ ok: true; specs: Record<string, string> } | { ok: false; error: string }> {
  const result = validateProductSpecsAgainstSchema(schema, specsInput);
  const err = validationErrorMessage(result);
  if (err) return { ok: false, error: err };

  await prisma.productAttributeValue.deleteMany({ where: { productId } });
  if (result.values.length) {
    await prisma.productAttributeValue.createMany({
      data: result.values.map((v) => ({
        productId,
        attributeKey: v.attributeKey,
        valueString: v.valueString,
        valueNumber: v.valueNumber,
        valueBoolean: v.valueBoolean,
        valueJson: v.valueJson as Prisma.InputJsonValue | undefined,
      })),
    });
  }

  return { ok: true, specs: result.specs };
}

export function mergeSpecsWithLegacy(
  fromValues: Record<string, string>,
  legacySpecs: unknown,
): Record<string, string> {
  if (!legacySpecs || typeof legacySpecs !== "object" || Array.isArray(legacySpecs)) {
    return fromValues;
  }
  const merged = { ...(legacySpecs as Record<string, string>) };
  for (const [k, v] of Object.entries(fromValues)) {
    if (v.trim()) merged[k] = v;
  }
  return merged;
}
