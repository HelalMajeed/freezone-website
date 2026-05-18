import type { AttributeType, FacetAttributeDef } from "@/lib/data";
import { FACET_ADMIN_LABEL_AR, FACET_ADMIN_LABEL_EN } from "@/lib/facet-admin-labels";
import { defaultAttributeMetaForKey, isAttributeType } from "@/lib/classification/presets";
import { normalizeAttributeKey, parseOptionsJson } from "@/lib/classification/values";

export type { FacetAttributeDef } from "@/lib/data";

function slugFromNameEn(nameEn: string): string {
  const s = nameEn
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  return s || "attribute";
}

export function defaultFacetNamesForKey(key: string): { name_en: string; name_ar: string } {
  const name_ar = (FACET_ADMIN_LABEL_AR[key] ?? key).trim();
  const name_en = (FACET_ADMIN_LABEL_EN[key] ?? key).trim();
  return { name_en, name_ar };
}

function parseFacetMetaFromObject(o: Record<string, unknown>, key: string): Partial<FacetAttributeDef> {
  const preset = defaultAttributeMetaForKey(key);
  let type: AttributeType | undefined;
  if (typeof o.type === "string" && isAttributeType(o.type.trim().toUpperCase())) {
    type = o.type.trim().toUpperCase() as AttributeType;
  }
  const options = parseOptionsJson(o.options);
  const filterable = typeof o.filterable === "boolean" ? o.filterable : preset.filterable;
  const searchable = typeof o.searchable === "boolean" ? o.searchable : preset.searchable;
  const comparable = typeof o.comparable === "boolean" ? o.comparable : preset.comparable;
  const required = typeof o.required === "boolean" ? o.required : preset.required;
  const displayGroup = typeof o.displayGroup === "string" ? o.displayGroup.trim() : preset.displayGroup;
  const unit = typeof o.unit === "string" ? o.unit.trim() : preset.unit;
  return {
    ...(type ? { type } : preset.type ? { type: preset.type } : {}),
    ...(options ? { options } : preset.options ? { options: preset.options } : {}),
    ...(filterable !== undefined ? { filterable } : {}),
    ...(searchable !== undefined ? { searchable } : {}),
    ...(comparable !== undefined ? { comparable } : {}),
    ...(required !== undefined ? { required } : {}),
    ...(displayGroup ? { displayGroup } : {}),
    ...(unit ? { unit } : {}),
  };
}

function enrichFacetDef(
  key: string,
  name_en: string,
  name_ar: string,
  partial?: Partial<FacetAttributeDef>,
): FacetAttributeDef {
  const preset = defaultAttributeMetaForKey(key);
  return {
    key: normalizeAttributeKey(key),
    name_en,
    name_ar,
    type: partial?.type ?? preset.type ?? "SELECT",
    options: partial?.options ?? preset.options,
    filterable: partial?.filterable ?? preset.filterable ?? true,
    searchable: partial?.searchable ?? preset.searchable ?? false,
    comparable: partial?.comparable ?? preset.comparable ?? false,
    displayGroup: partial?.displayGroup ?? preset.displayGroup ?? "specs",
    required: partial?.required ?? preset.required ?? false,
    unit: partial?.unit ?? preset.unit,
  };
}

export function parseFacetAttributesFromUnknown(raw: unknown): FacetAttributeDef[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: FacetAttributeDef[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const key = item.trim();
      if (!key) continue;
      const { name_en, name_ar } = defaultFacetNamesForKey(key);
      out.push(enrichFacetDef(key, name_en, name_ar));
      continue;
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const o = item as Record<string, unknown>;
      const key = typeof o.key === "string" ? o.key.trim() : "";
      if (!key) continue;
      let name_en = typeof o.name_en === "string" ? o.name_en.trim() : "";
      let name_ar = typeof o.name_ar === "string" ? o.name_ar.trim() : "";
      if (!name_en && typeof o.nameEn === "string") name_en = o.nameEn.trim();
      if (!name_ar && typeof o.nameAr === "string") name_ar = o.nameAr.trim();
      if (!name_en || !name_ar) {
        const d = defaultFacetNamesForKey(key);
        if (!name_en) name_en = d.name_en;
        if (!name_ar) name_ar = d.name_ar;
      }
      out.push(enrichFacetDef(key, name_en, name_ar, parseFacetMetaFromObject(o, key)));
    }
  }
  return dedupeByKey(out);
}

function dedupeByKey(attrs: FacetAttributeDef[]): FacetAttributeDef[] {
  const seen = new Set<string>();
  const out: FacetAttributeDef[] = [];
  for (const a of attrs) {
    if (seen.has(a.key)) continue;
    seen.add(a.key);
    out.push(a);
  }
  return out;
}

export function facetKeysFromAttributes(attrs: FacetAttributeDef[]): string[] {
  return attrs.map((a) => a.key);
}

export function facetAttributeDisplayName(attr: FacetAttributeDef, locale: "en" | "ar"): string {
  const primary = locale === "ar" ? attr.name_ar.trim() : attr.name_en.trim();
  const fallback = locale === "ar" ? attr.name_en.trim() : attr.name_ar.trim();
  return primary || fallback || attr.key;
}

export function validateFacetAttributesForSave(attrs: FacetAttributeDef[]): { ok: true } | { ok: false; error: string } {
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i];
    if (!a.key?.trim()) return { ok: false, error: `Missing attribute key at index ${i}` };
    if (!a.name_en?.trim()) return { ok: false, error: `Attribute "${a.key}": English name is required` };
    if (!a.name_ar?.trim()) return { ok: false, error: `Attribute "${a.key}": Arabic name is required` };
  }
  return { ok: true };
}

export function facetAttributesFromAdminFacetKeysBody(
  raw: unknown,
): { ok: true; attrs: FacetAttributeDef[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "facetKeys must be a JSON array of attribute objects or legacy string keys" };
  }
  const attrs = parseFacetAttributesFromUnknown(raw);
  const v = validateFacetAttributesForSave(attrs);
  if (!v.ok) return v;
  return { ok: true, attrs };
}

export function normalizeFacetKeyInput(raw: string): string {
  return normalizeAttributeKey(raw);
}

export function makeCustomFacetAttribute(nameEn: string, nameAr: string, keyOverride?: string): FacetAttributeDef {
  const name_en = nameEn.trim();
  const name_ar = nameAr.trim();
  const key = keyOverride?.trim() ? normalizeFacetKeyInput(keyOverride) : normalizeFacetKeyInput(slugFromNameEn(name_en));
  return enrichFacetDef(key, name_en, name_ar);
}
