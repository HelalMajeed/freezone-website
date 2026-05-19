import type { AttributeType, CategoryAttributeRow, ProductAttributeValueRow } from "./types";
import { isAttributeType } from "./types";
import { FUZZY_SELECT_FILTER_KEYS, fuzzySelectFilterMatch } from "./legacy-spec-map";

/** Normalize admin/storefront input key to snake_case. */
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

/** Display string for storefront `product.specs` and filter chips. */
export function attributeValueToDisplayString(row: ProductAttributeValueRow, type: AttributeType): string {
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
  if (type === "RANGE" || type === "SELECT" || type === "COLOR" || type === "TEXT") {
    if (row.valueNumber != null && Number.isFinite(row.valueNumber)) {
      return String(row.valueNumber);
    }
    return row.valueString?.trim() ?? "";
  }
  return row.valueString?.trim() ?? "";
}

export function productAttributeValuesToSpecs(
  values: ProductAttributeValueRow[],
  schema: CategoryAttributeRow[],
): Record<string, string> {
  const typeByKey = new Map(schema.map((a) => [a.key, normalizeAttributeType(a.type)]));
  const out: Record<string, string> = {};
  for (const v of values) {
    const type = typeByKey.get(v.attributeKey) ?? "SELECT";
    const display = attributeValueToDisplayString(v, type);
    if (display) out[v.attributeKey] = display;
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

/** Parse raw admin spec input into typed storage + display specs. */
export function parseSpecInputForAttribute(
  attr: CategoryAttributeRow,
  raw: unknown,
): { row: Omit<ProductAttributeValueRow, "attributeKey">; display: string } | null {
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) return null;

  const type = normalizeAttributeType(attr.type);

  if (type === "BOOLEAN") {
    const s = String(raw).trim().toLowerCase();
    const truthy = s === "true" || s === "1" || s === "yes" || s === "نعم";
    const falsy = s === "false" || s === "0" || s === "no" || s === "لا";
    if (!truthy && !falsy) return null;
    const valueBoolean = truthy;
    return {
      row: { valueString: null, valueNumber: null, valueBoolean, valueJson: null },
      display: valueBoolean ? "true" : "false",
    };
  }

  if (type === "MULTI_SELECT") {
    let items: string[];
    if (Array.isArray(raw)) {
      items = raw.map((x) => String(x).trim()).filter(Boolean);
    } else {
      items = String(raw)
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
      row: { valueString: items.join(", "), valueNumber: null, valueBoolean: null, valueJson: items },
      display: items.join(", "),
    };
  }

  if (type === "RANGE") {
    const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(n)) return null;
    return {
      row: { valueString: String(n), valueNumber: n, valueBoolean: null, valueJson: null },
      display: String(n),
    };
  }

  const display = String(raw).trim();
  if (!display) return null;

  if (type === "SELECT" || type === "COLOR") {
    const options = parseOptionsJson(attr.options);
    if (options?.length && !options.includes(display)) return null;
  }

  const num = parseFloat(display.replace(/[^\d.-]/g, ""));
  const looksNumeric = Number.isFinite(num) && /^[\d.]+$/.test(display);

  return {
    row: {
      valueString: display,
      valueNumber: looksNumeric && Number.isFinite(num) ? num : null,
      valueBoolean: null,
      valueJson: null,
    },
    display,
  };
}

/** Match product value against URL filter selection (supports RANGE min-max, BOOLEAN, MULTI). */
export function productValueMatchesFilterSelection(
  displayValue: string | undefined,
  type: AttributeType,
  selected: string[],
): boolean {
  if (!selected.length) return true;
  if (!displayValue?.trim()) return false;

  if (type === "BOOLEAN") {
    const v = displayValue.trim().toLowerCase();
    return selected.some((s) => {
      const want = s.trim().toLowerCase();
      if (want === "true") return v === "true" || v === "yes" || v === "1" || v === "نعم";
      if (want === "false") return v === "false" || v === "no" || v === "0" || v === "لا";
      return v === want;
    });
  }

  if (type === "RANGE") {
    const num = parseFloat(displayValue.replace(/[^\d.-]/g, ""));
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
    const parts = displayValue.split(/[,;|]/).map((x) => x.trim());
    return selected.some((s) => parts.includes(s.trim()));
  }

  return selected.includes(displayValue.trim());
}

export function productValueMatchesFilterSelectionForKey(
  attributeKey: string,
  displayValue: string | undefined,
  type: AttributeType,
  selected: string[],
): boolean {
  if (
    (type === "SELECT" || type === "TEXT") &&
    FUZZY_SELECT_FILTER_KEYS.has(attributeKey)
  ) {
    return fuzzySelectFilterMatch(attributeKey, displayValue, selected);
  }
  return productValueMatchesFilterSelection(displayValue, type, selected);
}
