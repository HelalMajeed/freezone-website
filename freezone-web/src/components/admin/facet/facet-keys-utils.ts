import type { FacetAttributeDef } from "@/lib/data";
import { parseFacetAttributesFromUnknown } from "@/lib/facet-attributes";

import { getAllFacetCatalogKeysOrdered } from "@/lib/facet-admin-labels";

const CATALOG_ORDER = getAllFacetCatalogKeysOrdered();

/** @deprecated use `parseFacetAttributesFromUnknown` */
export function parseFacetKeysFromUnknown(raw: unknown): FacetAttributeDef[] {
  return parseFacetAttributesFromUnknown(raw);
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
