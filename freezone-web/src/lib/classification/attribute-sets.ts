import type { FacetAttributeDef } from "@/lib/data";

export function isFilterableAttribute(attr: { filterable?: boolean }): boolean {
  return attr.filterable === true;
}

export function partitionFacetAttributes(attrs: FacetAttributeDef[]) {
  const filterableSpecs = attrs.filter(isFilterableAttribute);
  const extendedSpecs = attrs.filter((a) => !isFilterableAttribute(a));
  return { all: attrs, filterableSpecs, extendedSpecs };
}

/** Sidebar / URL filters only — never use for PDP or admin form field list. */
export function filterableFacetAttributes(attrs: FacetAttributeDef[]): FacetAttributeDef[] {
  return attrs.filter(isFilterableAttribute);
}

/** Admin + PDP — every category attribute regardless of filterable flag. */
export function allCategoryAttributesForForm(
  attrs: FacetAttributeDef[] | null | undefined,
): FacetAttributeDef[] {
  return attrs ?? [];
}
