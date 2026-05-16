import { facetKeysFromAttributes, parseFacetAttributesFromUnknown } from "@/lib/facet-attributes";

/** استخراج مفاتيح الفلاتر من حقل القسم (JSON: سلسلة نصوية أو كائنات `{ key, name_en, name_ar }`). */
export function facetKeysFromCategoryJson(facetKeys: unknown): string[] {
  return facetKeysFromAttributes(parseFacetAttributesFromUnknown(facetKeys));
}

export function normalizeSpecsInput(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v.trim();
    else if (v != null) out[k] = String(v).trim();
  }
  return out;
}

export function validateSpecsForFacetKeys(
  specs: Record<string, string>,
  requiredKeys: string[],
): { ok: true } | { ok: false; missing: string[] } {
  if (requiredKeys.length === 0) return { ok: true };
  const missing: string[] = [];
  for (const k of requiredKeys) {
    const v = specs[k];
    if (v == null || String(v).trim() === "") missing.push(k);
  }
  if (missing.length) return { ok: false, missing };
  return { ok: true };
}
