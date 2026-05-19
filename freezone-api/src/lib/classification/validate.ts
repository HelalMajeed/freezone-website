import type { CategoryAttributeRow } from "./types";
import { deriveFilterFacetsFromDisplay } from "./derive-filter-facets";
import { parseSpecInputForAttribute, productAttributeValuesToDisplaySpecs, parseSpecsPayload } from "./values";
import { specInputDisplay, specInputFilter } from "./spec-input";
import type { ProductAttributeValueRow } from "./types";
import type { SpecValueInput } from "./spec-input";

export type ValidatedProductSpecs = {
  specs: Record<string, string>;
  values: ProductAttributeValueRow[];
  missingRequired: string[];
  invalidKeys: string[];
};

/** Validate + normalize product specs against category schema (FRAMEWORK.md §G). */
export function validateProductSpecsAgainstSchema(
  schema: CategoryAttributeRow[],
  specsInput: unknown,
): ValidatedProductSpecs {
  const raw = parseSpecsPayload(specsInput);
  const displayByKey: Record<string, string> = {};
  const filterByKey: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const d = specInputDisplay(v);
    if (d) displayByKey[k] = d;
    const f = specInputFilter(v);
    if (f) filterByKey[k] = f;
  }
  const derivedFilters = deriveFilterFacetsFromDisplay(schema, displayByKey, filterByKey);
  const enriched: Record<string, string | SpecValueInput> = { ...raw };
  for (const [k, filter] of Object.entries(derivedFilters)) {
    if (filterByKey[k]?.trim()) continue;
    const attr = schema.find((a) => a.key === k);
    if (!attr?.filterable) continue;
    const prev = enriched[k];
    if (!prev) {
      enriched[k] = { display: displayByKey[k] ?? "", filter };
    } else if (typeof prev === "string") {
      enriched[k] = { display: prev, filter };
    } else {
      enriched[k] = { ...prev, filter };
    }
  }

  const schemaByKey = new Map(schema.map((a) => [a.key, a]));
  const values: ProductAttributeValueRow[] = [];
  const invalidKeys: string[] = [];
  const seen = new Set<string>();
  const snakeKey = /^[a-z][a-z0-9_]*$/;
  for (const attr of schema) {
    if (!snakeKey.test(attr.key)) {
      return {
        specs: {},
        values: [],
        missingRequired: [],
        invalidKeys: [attr.key],
      };
    }
  }

  for (const [k, v] of Object.entries(enriched)) {
    const attr = schemaByKey.get(k);
    const hasContent = typeof v === "string" ? v.trim() : v.display.trim() || v.filter?.trim();
    if (!attr) {
      if (hasContent) invalidKeys.push(k);
      continue;
    }
    seen.add(k);
    const parsed = parseSpecInputForAttribute(attr, v);
    if (!parsed) {
      if (hasContent) invalidKeys.push(k);
      continue;
    }
    values.push({
      attributeKey: attr.key,
      ...parsed.row,
    });
  }

  const missingRequired: string[] = [];
  for (const attr of schema) {
    if (!attr.required) continue;
    const has = values.some((x) => x.attributeKey === attr.key);
    if (!has) missingRequired.push(attr.key);
  }

  const specs = productAttributeValuesToDisplaySpecs(values, schema);
  return { specs, values, missingRequired, invalidKeys };
}

export function validationErrorMessage(result: ValidatedProductSpecs): string | null {
  if (result.missingRequired.length) {
    return `Required attributes missing: ${result.missingRequired.join(", ")}`;
  }
  if (result.invalidKeys.length) {
    return `Invalid or unknown attribute values: ${result.invalidKeys.join(", ")}`;
  }
  return null;
}
