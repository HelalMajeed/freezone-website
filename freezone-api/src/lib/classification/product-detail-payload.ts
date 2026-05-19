import type { Product, FacetAttributeDef } from "@/lib/data";
import type { CategoryAttributeRow } from "./types";
import { categoryAttributeRowsToFacetDefs } from "./sync";
import { partitionFacetAttributes } from "./attribute-sets";
import { productAttributeValuesToSpecs } from "./values";
import type { ProductAttributeValueRow } from "./types";

export type ProductDetailPayload = {
  product: Product;
  specs: Record<string, string>;
  filterableSpecs: Record<string, string>;
  extendedSpecs: Record<string, string>;
  attributes: FacetAttributeDef[];
  filterableAttributes: FacetAttributeDef[];
  extendedAttributes: FacetAttributeDef[];
};

export function buildProductDetailPayload(
  product: Product,
  schemaRows: CategoryAttributeRow[],
  attributeValues?: ProductAttributeValueRow[],
): ProductDetailPayload {
  const schema = schemaRows.filter((r) => r.active !== false);
  const attrs = categoryAttributeRowsToFacetDefs(schema);
  const { filterableSpecs: filterableAttributes, extendedSpecs: extendedAttributes } =
    partitionFacetAttributes(attrs);

  const fromEav =
    attributeValues?.length && schema.length
      ? productAttributeValuesToSpecs(attributeValues, schema)
      : {};
  const specs = { ...product.specs, ...fromEav };

  const filterableKeys = new Set(filterableAttributes.map((a) => a.key));
  const filterableSpecs: Record<string, string> = {};
  const extendedSpecs: Record<string, string> = {};
  for (const [k, v] of Object.entries(specs)) {
    if (!v?.trim()) continue;
    if (filterableKeys.has(k)) filterableSpecs[k] = v;
    else extendedSpecs[k] = v;
  }

  return {
    product: { ...product, specs },
    specs,
    filterableSpecs,
    extendedSpecs,
    attributes: attrs,
    filterableAttributes,
    extendedAttributes,
  };
}
