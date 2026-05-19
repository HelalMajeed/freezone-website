import { prisma } from "@/lib/prisma";
import { normalizeSpecsInput } from "@/lib/spec-validation";
import {
  loadCategoryAttributeSchema,
  saveProductSpecsNormalized,
} from "@/lib/classification/persist";
import { validateProductSpecsAgainstSchema, validationErrorMessage } from "@/lib/classification/validate";
import { syncCategoryAttributesFromFacetKeys } from "@/lib/classification/sync";
import { productAttributeValuesToSpecs } from "@/lib/classification/values";

async function getSchemaForCategory(categoryId: number) {
  let rows = await loadCategoryAttributeSchema(
    (args) => prisma.categoryAttribute.findMany(args),
    categoryId,
  );
  if (!rows.length) {
    const cat = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { facetKeys: true },
    });
    if (cat?.facetKeys) {
      rows = await syncCategoryAttributesFromFacetKeys(prisma, categoryId, cat.facetKeys);
    }
  }
  return rows;
}

/** Validate specs; returns normalized display map (no DB write). */
export async function validateProductSpecsAgainstCategory(
  categoryId: number,
  specsInput: unknown,
): Promise<{ ok: true; specs: Record<string, string> } | { ok: false; error: string }> {
  const schema = await getSchemaForCategory(categoryId);

  if (!schema.length) {
    const raw = normalizeSpecsInput(specsInput);
    const specs: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      const t = v.trim();
      if (t) specs[k] = t;
    }
    return { ok: true, specs };
  }

  const result = validateProductSpecsAgainstSchema(schema, specsInput);
  const err = validationErrorMessage(result);
  if (err) return { ok: false, error: err };
  return { ok: true, specs: result.specs };
}

/** Persist typed `ProductAttributeValue` rows + return specs JSON for `Product.specs`. */
export async function persistProductSpecsForProduct(
  productId: number,
  categoryId: number,
  specsInput: unknown,
): Promise<{ ok: true; specs: Record<string, string> } | { ok: false; error: string }> {
  const schema = await getSchemaForCategory(categoryId);
  if (!schema.length) {
    return validateProductSpecsAgainstCategory(categoryId, specsInput);
  }
  return saveProductSpecsNormalized(prisma, productId, schema, specsInput);
}

/** Merge EAV values into specs map for admin edit form (all attributes, not only filterable). */
export async function adminProductSpecsForEdit(
  productId: number,
  categoryId: number,
  specsJson: unknown,
): Promise<Record<string, string>> {
  const schema = await getSchemaForCategory(categoryId);
  const raw = normalizeSpecsInput(specsJson);
  if (!schema.length) return raw;

  const values = await prisma.productAttributeValue.findMany({ where: { productId } });
  const fromEav = values.length ? productAttributeValuesToSpecs(values, schema) : {};
  const merged = { ...fromEav, ...raw };
  const out: Record<string, string> = {};
  for (const attr of schema) {
    const v = merged[attr.key];
    if (v?.trim()) out[attr.key] = v.trim();
  }
  for (const [k, v] of Object.entries(merged)) {
    if (!schema.some((a) => a.key === k) && v.trim()) out[k] = v.trim();
  }
  return out;
}
