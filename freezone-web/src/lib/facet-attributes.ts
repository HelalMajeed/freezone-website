import type { FacetAttributeDef } from "@/lib/data";
import { FACET_ADMIN_LABEL_AR, FACET_ADMIN_LABEL_EN } from "@/lib/facet-admin-labels";

export type { FacetAttributeDef } from "@/lib/data";

function slugFromNameEn(nameEn: string): string {
  const s = nameEn
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  return s || "attribute";
}

/** Default bilingual labels for known catalog keys (used when DB has legacy string[]). */
export function defaultFacetNamesForKey(key: string): { name_en: string; name_ar: string } {
  const name_ar = (FACET_ADMIN_LABEL_AR[key] ?? key).trim();
  const name_en = (FACET_ADMIN_LABEL_EN[key] ?? key).trim();
  return { name_en, name_ar };
}

/**
 * Parse `Category.facetKeys` JSON: legacy `["cpu","gpu"]` or
 * `[{ "key": "cpu", "name_en": "…", "name_ar": "…" }]`.
 */
export function parseFacetAttributesFromUnknown(raw: unknown): FacetAttributeDef[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: FacetAttributeDef[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const key = item.trim();
      if (!key) continue;
      const { name_en, name_ar } = defaultFacetNamesForKey(key);
      out.push({ key, name_en, name_ar });
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
      out.push({ key, name_en, name_ar });
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

/** Storefront / admin: pick display name with cross-language fallback. */
export function facetAttributeDisplayName(attr: FacetAttributeDef, locale: "en" | "ar"): string {
  const primary = locale === "ar" ? attr.name_ar.trim() : attr.name_en.trim();
  const fallback = locale === "ar" ? attr.name_en.trim() : attr.name_ar.trim();
  return primary || fallback || attr.key;
}

/** Validate before persisting: every entry must have non-empty key, name_en, name_ar. */
export function validateFacetAttributesForSave(attrs: FacetAttributeDef[]): { ok: true } | { ok: false; error: string } {
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i];
    if (!a.key?.trim()) return { ok: false, error: `Missing attribute key at index ${i}` };
    if (!a.name_en?.trim()) return { ok: false, error: `Attribute "${a.key}": English name is required` };
    if (!a.name_ar?.trim()) return { ok: false, error: `Attribute "${a.key}": Arabic name is required` };
  }
  return { ok: true };
}

/** Normalize key for custom attributes (slug). */
export function normalizeFacetKeyInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\u0600-\u06FF-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function makeCustomFacetAttribute(nameEn: string, nameAr: string, keyOverride?: string): FacetAttributeDef {
  const name_en = nameEn.trim();
  const name_ar = nameAr.trim();
  const key = keyOverride?.trim() ? normalizeFacetKeyInput(keyOverride) : normalizeFacetKeyInput(slugFromNameEn(name_en));
  return { key, name_en, name_ar };
}
