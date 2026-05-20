import type { PrismaClient } from "@prisma/client";
import { loadCategoryAttributeSchema } from "./classification/persist";
import { deriveFilterFacetsFromDisplay } from "./classification/derive-filter-facets";
import { sanitizeFacetFilterToken } from "./classification/facet-filter-token";
import {
  productAttributeValuesToDisplaySpecs,
  productAttributeValuesToFilterValues,
} from "./classification/values";
import type { CategoryAttributeRow, ProductAttributeValueRow } from "./classification/types";

export type LaptopFilterPreview = {
  screen_size?: string | null;
  display_resolution?: string | null;
  refresh_rate?: string | null;
  gpu_model?: string | null;
  processor_family?: string | null;
  ram_size?: string | null;
  storage_size?: string | null;
};

export type LaptopFilterRepairResult =
  | {
      ok: true;
      payload: Record<string, string | { display: string; filter?: string }>;
      before: LaptopFilterPreview;
      after: LaptopFilterPreview;
      changed: boolean;
    }
  | { ok: false; reason: string };

function applySanitizedFilters(filterByKey: Record<string, string>): void {
  for (const [key, raw] of Object.entries(filterByKey)) {
    const token = sanitizeFacetFilterToken(key, raw);
    if (token) filterByKey[key] = token;
    else delete filterByKey[key];
  }
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

function previewPickKeys(src: Record<string, string | undefined | null>): LaptopFilterPreview {
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

/** Re-derive filter tokens from EAV display values (safe dry-run / repair). */
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
