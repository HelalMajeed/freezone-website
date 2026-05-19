import type { FacetAttributeDef } from "@/lib/data";
import type { CategoryAttributeRow } from "./types";
import { categoryAttributeRowsToFacetDefs } from "./sync";

export function isFilterableAttribute(attr: { filterable?: boolean }): boolean {
  return attr.filterable === true;
}

export function partitionFacetAttributes(attrs: FacetAttributeDef[]) {
  const filterableSpecs = attrs.filter(isFilterableAttribute);
  const extendedSpecs = attrs.filter((a) => !isFilterableAttribute(a));
  return { all: attrs, filterableSpecs, extendedSpecs };
}

export function partitionCategoryAttributeRows(rows: CategoryAttributeRow[]) {
  return partitionFacetAttributes(categoryAttributeRowsToFacetDefs(rows));
}

export function activeFilterableRows(rows: CategoryAttributeRow[]): CategoryAttributeRow[] {
  return rows.filter((r) => r.active !== false && r.filterable === true);
}
