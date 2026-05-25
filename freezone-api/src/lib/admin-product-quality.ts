import {
  isLongMarketingFacetText,
  MAX_FACET_FILTER_TOKEN_LEN,
  sanitizeFacetFilterToken,
} from "./classification/facet-filter-token";
import { sanitizeStoredScreenSize } from "./classification/laptop-filter-extract";
import type { CategoryAttributeRow, ProductAttributeValueRow } from "./classification/types";
import { resolveDisplaySpecKey } from "./classification/filter-display-link";
import { parseOptionsJson, productAttributeValuesToFilterValues } from "./classification/values";

export function invalidFilterReason(attributeKey: string, raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (t.length > MAX_FACET_FILTER_TOKEN_LEN) return `value exceeds ${MAX_FACET_FILTER_TOKEN_LEN} chars`;
  if (isLongMarketingFacetText(t)) return "marketing or display text in filter";
  const key = attributeKey.toLowerCase();
  if (key === "screen_size" || key === "size_inch") {
    if (!sanitizeStoredScreenSize(t)) return "screen size out of laptop range (10–20 inch)";
  }
  const sanitized = sanitizeFacetFilterToken(attributeKey, t);
  if (!sanitized) return "filter token failed sanitization";
  if (sanitized !== t && isLongMarketingFacetText(t)) return "filter not normalized";
  return null;
}

export type ProductQualityInput = {
  brand: string;
  brandId: number | null;
  categoryId: number;
  categorySlug: string;
  specs: unknown;
  attributeValues: ProductAttributeValueRow[];
  attributeValueCount: number;
};

function rowsToDisplayMap(rows: ProductAttributeValueRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const d = r.displayValue?.trim();
    if (d) out[r.attributeKey] = d;
  }
  return out;
}

/** Same rules as data-quality tab `missing_specs` — single source of truth. */
export function missingSpecsReason(
  p: ProductQualityInput,
  schema: CategoryAttributeRow[],
): string | null {
  if (schema.length === 0) return null;

  const values = p.attributeValues;
  const filters = productAttributeValuesToFilterValues(values, schema);
  const display = rowsToDisplayMap(values);

  if (p.attributeValueCount === 0) return "no attribute values";

  const schemaKeys = new Set(schema.map((a) => a.key));
  for (const v of values) {
    if (!schemaKeys.has(v.attributeKey)) {
      return `spec key not in category schema: ${v.attributeKey}`;
    }
  }

  for (const attr of schema.filter((a) => a.filterable)) {
    const displayKey = resolveDisplaySpecKey(attr, p.categorySlug);
    const filterVal = filters[attr.key]?.trim();
    const displayVal = displayKey ? display[displayKey]?.trim() : "";
    if (attr.required && !filterVal) return `required filter missing: ${attr.key}`;
    if (displayKey && (attr.displaySpecRequired || filterVal) && !displayVal) {
      return `linked display missing: ${displayKey} (filter ${attr.key})`;
    }
    if (filterVal && attr.options) {
      const opts = parseOptionsJson(attr.options);
      if (opts?.length && !opts.includes(filterVal)) {
        return `filter not in category options: ${attr.key}=${filterVal}`;
      }
    }
  }

  if ((display.gpu_full || display.gpu) && !filters.gpu_model) {
    return "gpu_model missing (gpu_full present)";
  }
  if ((display.processor_full || display.processor) && !filters.processor_family) {
    return "processor_family missing (processor_full present)";
  }

  return null;
}

export function hasLegacySpecsOnly(p: ProductQualityInput): boolean {
  const legacy =
    p.specs && typeof p.specs === "object" && !Array.isArray(p.specs)
      ? Object.keys(p.specs as Record<string, unknown>).length > 0
      : false;
  return legacy && p.attributeValueCount === 0;
}

export function hasInvalidFilters(
  p: ProductQualityInput,
  schema: CategoryAttributeRow[],
): boolean {
  const values = p.attributeValues;
  const filters = productAttributeValuesToFilterValues(values, schema);

  for (const attr of schema.filter((a) => a.filterable)) {
    const raw = values.find((v) => v.attributeKey === attr.key)?.valueString ?? filters[attr.key];
    const filterVal = raw?.trim() ?? "";
    const opts = parseOptionsJson(attr.options);
    if (opts?.length && filterVal) {
      const parts =
        attr.type === "MULTI_SELECT"
          ? filterVal.split(",").map((s) => s.trim()).filter(Boolean)
          : [filterVal];
      if (parts.some((part) => !opts.includes(part))) return true;
    }
    if (invalidFilterReason(attr.key, raw)) return true;
  }

  for (const [key, val] of Object.entries(filters)) {
    if (key.endsWith("_full") || key.endsWith("_display")) continue;
    if (invalidFilterReason(key, val)) return true;
  }
  return false;
}

export function mapAttributeValues(
  rows: {
    attributeKey: string;
    displayValue: string | null;
    valueString: string | null;
    valueNumber: number | null;
    valueBoolean: boolean | null;
    valueJson: unknown;
  }[],
): ProductAttributeValueRow[] {
  return rows.map((v) => ({
    attributeKey: v.attributeKey,
    displayValue: v.displayValue,
    valueString: v.valueString,
    valueNumber: v.valueNumber,
    valueBoolean: v.valueBoolean,
    valueJson: v.valueJson,
  }));
}
