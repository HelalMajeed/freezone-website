import type { FacetAttributeDef } from "@/lib/data";
import { defaultFacetNamesForKey, makeCustomFacetAttribute, parseFacetAttributesFromUnknown } from "@/lib/facet-attributes";
import { getAllFacetCatalogKeysOrdered } from "@/lib/facet-admin-labels";
import { CATEGORY_FACETS, resolveCatalogFacetSlug } from "@/lib/productFacetConfig";

const CATALOG_ORDER = getAllFacetCatalogKeysOrdered();

/** @deprecated use `parseFacetAttributesFromUnknown` */
export function parseFacetKeysFromUnknown(raw: unknown): FacetAttributeDef[] {
  return parseFacetAttributesFromUnknown(raw);
}

/**
 * Admin categories: use saved `facetKeys` from the API when present; otherwise hydrate from
 * `CATEGORY_FACETS` for this slug (via `resolveCatalogFacetSlug`, e.g. `ipad` → `tablets`) so
 * defaults appear in the UI until the user saves once to persist them on the category row.
 */
export function parseAdminCategoryFacetKeys(slug: string, raw: unknown): FacetAttributeDef[] {
  const fromDb = facetAttributesToOrderedSelection(parseFacetAttributesFromUnknown(raw));
  if (fromDb.length > 0) return fromDb;
  const s = slug.trim();
  const defs = CATEGORY_FACETS[resolveCatalogFacetSlug(s)] ?? CATEGORY_FACETS[s];
  if (!defs?.length) return [];
  return defs.map((d) => {
    const fb = defaultFacetNamesForKey(d.key);
    return makeCustomFacetAttribute(
      (d.name_en?.trim() || fb.name_en).trim(),
      (d.name_ar?.trim() || fb.name_ar).trim(),
      d.key,
    );
  });
}

export function facetAttributesToOrderedSelection(attrs: FacetAttributeDef[]): FacetAttributeDef[] {
  // Keep user-defined order (manual sorting in admin), while still de-duplicating by key.
  const map = new Map<string, FacetAttributeDef>();
  for (const a of attrs) {
    if (!a?.key || map.has(a.key)) continue;
    map.set(a.key, a);
  }
  const out: FacetAttributeDef[] = [];
  for (const a of map.values()) out.push(a);
  return out;
}

export function getFacetCatalogOrder(): readonly string[] {
  return CATALOG_ORDER;
}

/** @deprecated alias — use `facetAttributesToOrderedSelection` */
export const facetKeysToOrderedSelection = facetAttributesToOrderedSelection;
