import { prisma } from "@/lib/prisma";
import { normalizeSpecsInput } from "@/lib/spec-validation";
import {
  loadCategoryAttributeSchema,
  saveProductSpecsNormalized,
} from "@/lib/classification/persist";
import { validateProductSpecsAgainstSchema, validationErrorMessage } from "@/lib/classification/validate";
import { ensureCategorySchemaComplete } from "@/lib/classification/ensure-category-schema";
import { syncCategoryAttributesFromFacetKeys } from "@/lib/classification/sync";
import { productAttributeValuesToPdpDisplaySpecs } from "@/lib/classification/product-detail-specs";
import { productAttributeValuesToFilterValues } from "@/lib/classification/values";

async function getSchemaForCategory(categoryId: number) {
  const cat = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { slug: true, facetKeys: true },
  });
  let rows = await loadCategoryAttributeSchema(
    (args) => prisma.categoryAttribute.findMany(args),
    categoryId,
  );
  if (!rows.length && cat?.facetKeys) {
    rows = await syncCategoryAttributesFromFacetKeys(prisma, categoryId, cat.facetKeys);
  }
  if (cat?.slug) {
    rows = await ensureCategorySchemaComplete(prisma, categoryId, cat.slug, rows);
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
): Promise<{ displaySpecs: Record<string, string>; filterSpecs: Record<string, string> }> {
  const schema = await getSchemaForCategory(categoryId);
  const raw = normalizeSpecsInput(specsJson);
  if (!schema.length) {
    return { displaySpecs: raw, filterSpecs: {} };
  }

  const values = await prisma.productAttributeValue.findMany({ where: { productId } });
  const fromDisplay = values.length ? productAttributeValuesToPdpDisplaySpecs(values, schema) : {};
  const fromFilter = values.length ? productAttributeValuesToFilterValues(values, schema) : {};
  const displaySpecs: Record<string, string> = {};
  const filterSpecs: Record<string, string> = {};
  for (const attr of schema) {
    const d = (fromDisplay[attr.key] ?? raw[attr.key] ?? "").trim();
    const f = (fromFilter[attr.key] ?? "").trim();
    if (d) displaySpecs[attr.key] = d;
    if (f) filterSpecs[attr.key] = f;
  }
  return { displaySpecs, filterSpecs };
}

export function buildSpecsPayloadForSave(
  attributes: { key: string; filterable?: boolean }[],
  displaySpecs: Record<string, string>,
  filterSpecs: Record<string, string>,
): Record<string, string | { display: string; filter?: string }> {
  const out: Record<string, string | { display: string; filter?: string }> = {};
  for (const attr of attributes) {
    const display = (displaySpecs[attr.key] ?? "").trim();
    const filter = (filterSpecs[attr.key] ?? "").trim();
    if (!display && !filter) continue;
    if (attr.filterable) {
      out[attr.key] = { display, ...(filter ? { filter } : {}) };
    } else {
      out[attr.key] = display;
    }
  }
  return out;
}
