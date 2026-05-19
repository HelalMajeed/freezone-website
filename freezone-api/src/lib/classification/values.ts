import type { AttributeType, CategoryAttributeRow, ProductAttributeValueRow } from "./types";
import { isAttributeType } from "./types";
import { FUZZY_SELECT_FILTER_KEYS, fuzzySelectFilterMatch } from "./legacy-spec-map";
import { normalizeFilterValue } from "./filter-value";
import { sanitizeFacetFilterToken } from "./facet-filter-token";
import { parseSpecsPayload, specInputDisplay, specInputFilter, type SpecValueInput } from "./spec-input";

export function normalizeAttributeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\u0600-\u06FF-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function parseOptionsJson(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.map((x) => String(x).trim()).filter(Boolean);
  return out.length ? out : undefined;
}

/** Full text for product detail page — never a short filter-only token. */
export function attributeValueToPdpDisplayString(
  row: ProductAttributeValueRow,
  type: AttributeType,
  attr: Pick<CategoryAttributeRow, "filterable" | "unit">,
): string {
  const explicit = row.displayValue?.trim();
  if (explicit) return explicit;

  if (attr.filterable === true) {
    const stored = row.valueString?.trim() ?? "";
    if (stored.length > 48) return stored;
    return "";
  }

  return attributeValueToTypedDisplayString(row, type, attr.unit);
}

function attributeValueToTypedDisplayString(
  row: ProductAttributeValueRow,
  type: AttributeType,
  unit?: string | null,
): string {
  if (type === "BOOLEAN") {
    if (row.valueBoolean === true) return "true";
    if (row.valueBoolean === false) return "false";
    return "";
  }
  if (type === "MULTI_SELECT") {
    if (Array.isArray(row.valueJson)) {
      return row.valueJson.map((x) => String(x).trim()).filter(Boolean).join(", ");
    }
    return row.valueString?.trim() ?? "";
  }
  if (type === "RANGE") {
    if (row.valueNumber != null && Number.isFinite(row.valueNumber)) {
      const n = String(row.valueNumber);
      return unit?.trim() ? `${n} ${unit.trim()}` : n;
    }
    return row.valueString?.trim() ?? "";
  }
  if (row.valueNumber != null && Number.isFinite(row.valueNumber)) {
    const n = String(row.valueNumber);
    return unit?.trim() ? `${n} ${unit.trim()}` : n;
  }
  return row.valueString?.trim() ?? "";
}

/** Display map for Product.specs JSON (catalog). */
export function attributeValueToDisplayString(
  row: ProductAttributeValueRow,
  type: AttributeType,
  filterable = false,
): string {
  const explicit = row.displayValue?.trim();
  if (explicit) return explicit;

  if (filterable) {
    return "";
  }

  return attributeValueToTypedDisplayString(row, type, null);
}

/** Short normalized token for category/search filters. */
export function attributeValueToFilterString(
  row: ProductAttributeValueRow,
  type: AttributeType,
  attributeKey: string,
): string {
  if (type === "BOOLEAN") {
    if (row.valueBoolean === true) return "true";
    if (row.valueBoolean === false) return "false";
    return "";
  }
  if (type === "MULTI_SELECT") {
    if (Array.isArray(row.valueJson)) {
      return row.valueJson.map((x) => String(x).trim()).filter(Boolean).join(", ");
    }
    return row.valueString?.trim() ?? "";
  }
  if (type === "RANGE") {
    if (row.valueNumber != null && Number.isFinite(row.valueNumber)) return String(row.valueNumber);
    return row.valueString?.trim() ?? "";
  }
  const filterStored = row.valueString?.trim();
  if (filterStored) {
    const sanitized = sanitizeFacetFilterToken(attributeKey, filterStored);
    if (sanitized) return sanitized;
    if (filterStored.length > 64) {
      const derived = normalizeFilterValue(attributeKey, filterStored);
      return sanitizeFacetFilterToken(attributeKey, derived) ?? "";
    }
    return "";
  }
  if (row.valueNumber != null && Number.isFinite(row.valueNumber)) {
    return String(row.valueNumber);
  }
  return "";
}

export function productAttributeValuesToDisplaySpecs(
  values: ProductAttributeValueRow[],
  schema: CategoryAttributeRow[],
): Record<string, string> {
  const attrByKey = new Map(schema.map((a) => [a.key, a]));
  const out: Record<string, string> = {};
  for (const v of values) {
    const attr = attrByKey.get(v.attributeKey);
    if (!attr) continue;
    const type = normalizeAttributeType(attr.type);
    const display = attributeValueToPdpDisplayString(v, type, attr);
    if (display) out[v.attributeKey] = display;
  }
  return out;
}

/** @deprecated alias — display specs for Product.specs JSON */
export function productAttributeValuesToSpecs(
  values: ProductAttributeValueRow[],
  schema: CategoryAttributeRow[],
): Record<string, string> {
  return productAttributeValuesToDisplaySpecs(values, schema);
}

export function productAttributeValuesToFilterValues(
  values: ProductAttributeValueRow[],
  schema: CategoryAttributeRow[],
): Record<string, string> {
  const typeByKey = new Map(schema.map((a) => [a.key, normalizeAttributeType(a.type)]));
  const filterable = new Set(schema.filter((a) => a.filterable === true).map((a) => a.key));
  const out: Record<string, string> = {};
  for (const v of values) {
    if (!filterable.has(v.attributeKey)) continue;
    const type = typeByKey.get(v.attributeKey) ?? "SELECT";
    const raw = attributeValueToFilterString(v, type, v.attributeKey);
    const filter = raw ? sanitizeFacetFilterToken(v.attributeKey, raw) : undefined;
    if (filter) out[v.attributeKey] = filter;
  }
  return out;
}

export function normalizeAttributeType(raw: string): AttributeType {
  const u = raw.trim().toUpperCase().replace(/-/g, "_");
  if (isAttributeType(u)) return u;
  const legacy: Record<string, AttributeType> = {
    TEXT: "TEXT",
    SELECT: "SELECT",
    NUMBER: "RANGE",
    BOOLEAN: "BOOLEAN",
    COLOR: "COLOR",
  };
  return legacy[u] ?? "SELECT";
}

export function parseSpecInputForAttribute(
  attr: CategoryAttributeRow,
  raw: string | SpecValueInput,
): { row: Omit<ProductAttributeValueRow, "attributeKey">; display: string; filter: string } | null {
  const displayRaw = specInputDisplay(raw);
  const filterOverride = specInputFilter(raw);
  if (!displayRaw && !filterOverride) return null;

  const type = normalizeAttributeType(attr.type);
  const display = displayRaw;

  if (type === "BOOLEAN") {
    const s = (filterOverride ?? displayRaw).trim().toLowerCase();
    const truthy = s === "true" || s === "1" || s === "yes" || s === "نعم";
    const falsy = s === "false" || s === "0" || s === "no" || s === "لا";
    if (!truthy && !falsy) return null;
    const valueBoolean = truthy;
    return {
      row: {
        displayValue: displayRaw || (valueBoolean ? "true" : "false"),
        valueString: valueBoolean ? "true" : "false",
        valueNumber: null,
        valueBoolean,
        valueJson: null,
      },
      display: displayRaw || (valueBoolean ? "true" : "false"),
      filter: valueBoolean ? "true" : "false",
    };
  }

  if (type === "MULTI_SELECT") {
    const source = filterOverride ?? displayRaw;
    let items: string[];
    if (Array.isArray(source)) {
      items = source.map((x) => String(x).trim()).filter(Boolean);
    } else {
      items = String(source)
        .split(/[,;|]/)
        .map((x) => x.trim())
        .filter(Boolean);
    }
    if (!items.length) return null;
    const options = parseOptionsJson(attr.options);
    if (options?.length) {
      const invalid = items.filter((i) => !options.includes(i));
      if (invalid.length) return null;
    }
    return {
      row: {
        displayValue: displayRaw || items.join(", "),
        valueString: items.join(", "),
        valueNumber: null,
        valueBoolean: null,
        valueJson: items,
      },
      display: displayRaw || items.join(", "),
      filter: items.join(", "),
    };
  }

  if (type === "RANGE") {
    const n = parseFloat(String(filterOverride ?? displayRaw).replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(n)) return null;
    const filterStr = String(n);
    return {
      row: {
        displayValue: displayRaw || filterStr,
        valueString: filterStr,
        valueNumber: n,
        valueBoolean: null,
        valueJson: null,
      },
      display: displayRaw || filterStr,
      filter: filterStr,
    };
  }

  if (!displayRaw && !filterOverride) return null;

  if (type === "SELECT" || type === "COLOR") {
    const filterVal =
      filterOverride ?? (displayRaw ? normalizeFilterValue(attr.key, displayRaw) : "");
    if (!filterVal && !displayRaw) return null;
    const options = parseOptionsJson(attr.options);
    if (options?.length && filterVal && !options.includes(filterVal)) {
      if (!attr.filterable && displayRaw && !options.includes(displayRaw)) return null;
    }
    return {
      row: {
        displayValue: displayRaw || null,
        valueString: filterVal,
        valueNumber: null,
        valueBoolean: null,
        valueJson: null,
      },
      display: displayRaw,
      filter: filterVal,
    };
  }

  const filterVal =
    filterOverride ?? (displayRaw ? normalizeFilterValue(attr.key, displayRaw) : "");
  if (!filterVal && !displayRaw) return null;
  const num = parseFloat(filterVal.replace(/[^\d.-]/g, ""));
  const looksNumeric = Number.isFinite(num) && /^[\d.]+$/.test(filterVal);

  return {
    row: {
      displayValue: displayRaw || null,
      valueString: filterVal,
      valueNumber: looksNumeric && Number.isFinite(num) ? num : null,
      valueBoolean: null,
      valueJson: null,
    },
    display: displayRaw,
    filter: filterVal,
  };
}

export function productValueMatchesFilterSelection(
  filterValue: string | undefined,
  type: AttributeType,
  selected: string[],
): boolean {
  if (!selected.length) return true;
  if (!filterValue?.trim()) return false;

  if (type === "BOOLEAN") {
    const v = filterValue.trim().toLowerCase();
    return selected.some((s) => {
      const want = s.trim().toLowerCase();
      if (want === "true") return v === "true" || v === "yes" || v === "1" || v === "نعم";
      if (want === "false") return v === "false" || v === "no" || v === "0" || v === "لا";
      return v === want;
    });
  }

  if (type === "RANGE") {
    const num = parseFloat(filterValue.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(num)) return false;
    for (const sel of selected) {
      const m = sel.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
      if (m) {
        const min = parseFloat(m[1]);
        const max = parseFloat(m[2]);
        if (num >= min && num <= max) return true;
        continue;
      }
      const exact = parseFloat(sel);
      if (Number.isFinite(exact) && num === exact) return true;
    }
    return false;
  }

  if (type === "MULTI_SELECT") {
    const parts = filterValue.split(/[,;|]/).map((x) => x.trim());
    return selected.some((s) => parts.includes(s.trim()));
  }

  return selected.includes(filterValue.trim());
}

export function productValueMatchesFilterSelectionForKey(
  attributeKey: string,
  filterValue: string | undefined,
  type: AttributeType,
  selected: string[],
): boolean {
  if (
    (type === "SELECT" || type === "TEXT") &&
    FUZZY_SELECT_FILTER_KEYS.has(attributeKey)
  ) {
    return fuzzySelectFilterMatch(attributeKey, filterValue, selected);
  }
  return productValueMatchesFilterSelection(filterValue, type, selected);
}

export { parseSpecsPayload };
