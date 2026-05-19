import type { PrismaClient } from "@prisma/client";
import { loadCategoryAttributeSchema, saveProductSpecsNormalized } from "../../src/lib/classification/persist";
import {
  readLegacyRawDisplay,
  remapLegacySpecsForCategory,
} from "../../src/lib/classification/legacy-spec-map";
import { normalizeFilterValue } from "../../src/lib/classification/filter-value";
import { deriveFilterFacetsFromDisplay } from "../../src/lib/classification/derive-filter-facets";
import { ensureCategorySchemaComplete } from "../../src/lib/classification/ensure-category-schema";
import { sanitizeFacetFilterToken } from "../../src/lib/classification/facet-filter-token";
import type { CategoryAttributeRow } from "../../src/lib/classification/types";

export type LegacySyncPreview = {
  processor_family?: string;
  gpu_model?: string;
  ram_size?: string;
  storage_size?: string;
};

export type LegacySyncBuildResult =
  | {
      ok: true;
      payload: Record<string, string | { display: string; filter?: string }>;
      preview: LegacySyncPreview;
      attrCount: number;
    }
  | { ok: false; reason: string };

function isDisplaySpecKey(key: string): boolean {
  return key.endsWith("_full") || key.endsWith("_display");
}

function applySanitizedFilters(filterByKey: Record<string, string>): void {
  for (const [key, raw] of Object.entries(filterByKey)) {
    const token = sanitizeFacetFilterToken(key, raw);
    if (token) filterByKey[key] = token;
    else delete filterByKey[key];
  }
}

function previewFromFilters(filterByKey: Record<string, string>): LegacySyncPreview {
  return {
    processor_family: filterByKey.processor_family,
    gpu_model: filterByKey.gpu_model,
    ram_size: filterByKey.ram_size,
    storage_size: filterByKey.storage_size,
  };
}

export async function buildLegacyProductSpecsPayload(
  prisma: PrismaClient,
  product: {
    id: number;
    categoryId: number;
    specs: unknown;
    category: { slug: string };
  },
): Promise<LegacySyncBuildResult> {
  const specs =
    product.specs && typeof product.specs === "object" && !Array.isArray(product.specs)
      ? (product.specs as Record<string, string>)
      : null;

  if (!specs || !Object.keys(specs).length) {
    return { ok: false, reason: "no legacy specs JSON on product" };
  }

  let schema = await loadCategoryAttributeSchema(
    (args) => prisma.categoryAttribute.findMany(args),
    product.categoryId,
  );
  schema = await ensureCategorySchemaComplete(prisma, product.categoryId, product.category.slug, schema);

  if (!schema.length) {
    return { ok: false, reason: `no category schema for slug=${product.category.slug}` };
  }

  const remapped = remapLegacySpecsForCategory(
    product.category.slug,
    specs,
    schema.map((a) => a.key),
  );

  const displayByKey: Record<string, string> = {};
  const filterByKey: Record<string, string> = {};

  const cpuLegacy = specs.cpu?.trim() || specs.processor?.trim();
  if (cpuLegacy && product.category.slug === "laptops") {
    if (schema.some((a) => a.key === "processor_full")) displayByKey.processor_full = cpuLegacy;
  }
  const ramLegacy = specs.ram?.trim();
  if (ramLegacy && product.category.slug === "laptops") displayByKey.ram_display = ramLegacy;
  const storageLegacy = specs.storage?.trim();
  if (storageLegacy && product.category.slug === "laptops") displayByKey.storage_display = storageLegacy;
  const gpuLegacy = specs.gpu?.trim();
  if (gpuLegacy && product.category.slug === "laptops") displayByKey.gpu_full = gpuLegacy;

  for (const attr of schema) {
    const rawDisplay = readLegacyRawDisplay(specs, product.category.slug, attr.key);
    const normalized =
      remapped[attr.key] ?? (rawDisplay ? normalizeFilterValue(attr.key, rawDisplay) : "");

    if (attr.filterable) {
      const filterToken = normalized ? sanitizeFacetFilterToken(attr.key, normalized) : undefined;
      if (filterToken) filterByKey[attr.key] = filterToken;
      if (rawDisplay && (isDisplaySpecKey(attr.key) || rawDisplay.length > 48)) {
        displayByKey[attr.key] = rawDisplay;
      }
    } else if (rawDisplay) {
      displayByKey[attr.key] = rawDisplay;
    }
  }

  const derived = deriveFilterFacetsFromDisplay(schema, displayByKey, filterByKey);
  Object.assign(filterByKey, derived);
  applySanitizedFilters(filterByKey);

  const payload: Record<string, string | { display: string; filter?: string }> = {};
  const keys = new Set([...Object.keys(displayByKey), ...Object.keys(filterByKey)]);
  for (const key of keys) {
    const display = displayByKey[key]?.trim() ?? "";
    const filter = filterByKey[key]?.trim();
    const attr = schema.find((a) => a.key === key);
    if (!display && !filter) continue;
    if (attr?.filterable) {
      if (!display && !filter) continue;
      payload[key] = { display, ...(filter ? { filter } : {}) };
    } else if (display) {
      payload[key] = display;
    }
  }

  if (!Object.keys(payload).length) {
    return { ok: false, reason: "could not derive display/filter payload from legacy specs" };
  }

  return {
    ok: true,
    payload,
    preview: previewFromFilters(filterByKey),
    attrCount: Object.keys(payload).length,
  };
}

export async function persistLegacyProductSpecs(
  prisma: PrismaClient,
  productId: number,
  categoryId: number,
  payload: Record<string, string | { display: string; filter?: string }>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const schema = await loadCategoryAttributeSchema(
    (args) => prisma.categoryAttribute.findMany(args),
    categoryId,
  );
  const schemaRelaxed: CategoryAttributeRow[] = schema.map((a) => ({ ...a, options: null }));
  const r = await saveProductSpecsNormalized(prisma, productId, schemaRelaxed, payload);
  if (!r.ok) {
    return { ok: false, error: "error" in r ? r.error : "save failed" };
  }
  await prisma.product.update({
    where: { id: productId },
    data: { specs: r.specs as object },
  });
  return { ok: true };
}
