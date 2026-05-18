import type { CategoryAttributeRow } from "./types";
import { normalizeSpecsInput } from "@/lib/spec-validation";
import { parseSpecInputForAttribute, productAttributeValuesToSpecs } from "./values";
import type { ProductAttributeValueRow } from "./types";

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
  const raw = normalizeSpecsInput(specsInput);
  const schemaByKey = new Map(schema.map((a) => [a.key, a]));
  const values: ProductAttributeValueRow[] = [];
  const invalidKeys: string[] = [];
  const seen = new Set<string>();

  for (const [k, v] of Object.entries(raw)) {
    const attr = schemaByKey.get(k);
    if (!attr) {
      if (v.trim()) invalidKeys.push(k);
      continue;
    }
    seen.add(k);
    const parsed = parseSpecInputForAttribute(attr, v);
    if (!parsed) {
      if (v.trim()) invalidKeys.push(k);
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

  const specs = productAttributeValuesToSpecs(values, schema);
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
