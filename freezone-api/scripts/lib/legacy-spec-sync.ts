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
import {
  productAttributeValuesToDisplaySpecs,
  productAttributeValuesToFilterValues,
} from "../../src/lib/classification/values";
import type { CategoryAttributeRow, ProductAttributeValueRow } from "../../src/lib/classification/types";

export type LaptopFilterPreview = {
  screen_size?: string | null;
  display_resolution?: string | null;
  refresh_rate?: string | null;
  gpu_model?: string | null;
  processor_family?: string | null;
  ram_size?: string | null;
  storage_size?: string | null;
};

export type LegacySyncPreview = LaptopFilterPreview;

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
    screen_size: filterByKey.screen_size ?? null,
    display_resolution: filterByKey.display_resolution ?? null,
    refresh_rate: filterByKey.refresh_rate ?? null,
    gpu_model: filterByKey.gpu_model ?? null,
    processor_family: filterByKey.processor_family ?? null,
    ram_size: filterByKey.ram_size ?? null,
    storage_size: filterByKey.storage_size ?? null,
  };
}

function rebuildFilterByKeyFromDisplay(
  schema: CategoryAttributeRow[],
  displayByKey: Record<string, string>,
  seedFilters: Record<string, string> = {},
): Record<string, string> {
  const filterByKey = { ...seedFilters };
  applySanitizedFilters(filterByKey);
  const derived = deriveFilterFacetsFromDisplay(schema, displayByKey, filterByKey);
  Object.assign(filterByKey, derived);
  applySanitizedFilters(filterByKey);
  return filterByKey;
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

  Object.assign(filterByKey, rebuildFilterByKeyFromDisplay(schema, displayByKey, filterByKey));

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

export type LaptopFilterRepairResult =
  | {
      ok: true;
      payload: Record<string, string | { display: string; filter?: string }>;
      before: LaptopFilterPreview;
      after: LaptopFilterPreview;
      changed: boolean;
    }
  | { ok: false; reason: string };

function previewPickKeys(
  src: Record<string, string | undefined | null>,
): LaptopFilterPreview {
  return {
    screen_size: src.screen_size ?? null,
    display_resolution: src.display_resolution ?? null,
    refresh_rate: src.refresh_rate ?? null,
    gpu_model: src.gpu_model ?? null,
    processor_family: src.processor_family ?? null,
    ram_size: src.ram_size ?? null,
    storage_size: src.storage_size ?? null,
  };
}

function filtersChanged(before: LaptopFilterPreview, after: LaptopFilterPreview): boolean {
  const keys = [
    "screen_size",
    "display_resolution",
    "refresh_rate",
    "gpu_model",
    "processor_family",
    "ram_size",
    "storage_size",
  ] as const;
  return keys.some((k) => (before[k] ?? null) !== (after[k] ?? null));
}

/** Re-derive laptop filter tokens from existing EAV display values (no legacy JSON required). */
export async function buildLaptopFilterRepairFromEav(
  prisma: PrismaClient,
  product: { id: number; categoryId: number },
): Promise<LaptopFilterRepairResult> {
  const schema = await loadCategoryAttributeSchema(
    (args) => prisma.categoryAttribute.findMany(args),
    product.categoryId,
  );
  if (!schema.length) {
    return { ok: false, reason: "no category schema" };
  }

  const rows = await prisma.productAttributeValue.findMany({
    where: { productId: product.id },
  });
  const values: ProductAttributeValueRow[] = rows.map((r) => ({
    attributeKey: r.attributeKey,
    displayValue: r.displayValue,
    valueString: r.valueString,
    valueNumber: r.valueNumber,
    valueBoolean: r.valueBoolean,
    valueJson: r.valueJson,
  }));

  if (!values.length) {
    return { ok: false, reason: "no attribute values on product" };
  }

  const displayByKey = productAttributeValuesToDisplaySpecs(values, schema);
  const beforeFilters = productAttributeValuesToFilterValues(values, schema);
  const before = previewPickKeys(beforeFilters);

  const filterByKey = rebuildFilterByKeyFromDisplay(schema, displayByKey, beforeFilters);
  const after = previewPickKeys(filterByKey);

  const payload: Record<string, string | { display: string; filter?: string }> = {};
  const keys = new Set([...Object.keys(displayByKey), ...Object.keys(filterByKey)]);
  for (const key of keys) {
    const display = displayByKey[key]?.trim() ?? "";
    const filter = filterByKey[key]?.trim();
    const attr = schema.find((a) => a.key === key);
    if (!display && !filter) continue;
    if (attr?.filterable) {
      payload[key] = { display, ...(filter ? { filter } : {}) };
    } else if (display) {
      payload[key] = display;
    }
  }

  if (!Object.keys(payload).length) {
    return { ok: false, reason: "empty payload after repair" };
  }

  return {
    ok: true,
    payload,
    before,
    after,
    changed: filtersChanged(before, after),
  };
}
