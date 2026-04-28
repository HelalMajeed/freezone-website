import { normalizeSpecsInput } from "@/lib/spec-validation";

/** Category facet fields are optional — only non-empty values are stored. */
export async function validateProductSpecsAgainstCategory(
  _categoryId: number,
  specsInput: unknown,
): Promise<{ ok: true; specs: Record<string, string> }> {
  const raw = normalizeSpecsInput(specsInput);
  const specs: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const t = v.trim();
    if (t) specs[k] = t;
  }
  return { ok: true, specs };
}
