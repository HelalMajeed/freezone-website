import type { Product, FacetAttributeDef } from "@/lib/data";
import type { CategoryAttributeRow } from "./types";
import type { ProductAttributeValueRow } from "./types";
import {
  buildProductDetailSpecPresentation,
  type ProductDetailSpecGroup,
  type ProductDetailSpecItem,
} from "./product-detail-specs";

export type ProductVariantDto = {
  id: number;
  sku: string;
  label: string;
  price: number | null;
  quantity: number;
  active: boolean;
};

export type ProductDetailPayload = {
  product: Product;
  specs: Record<string, string>;
  groupedSpecs: ProductDetailSpecGroup[];
  specRows: ProductDetailSpecItem[];
  attributes: FacetAttributeDef[];
  variants: ProductVariantDto[];
};

export function buildProductDetailPayload(
  product: Product,
  schemaRows: CategoryAttributeRow[],
  attributeValues: ProductAttributeValueRow[] | undefined,
  locale: "en" | "ar",
  variants: ProductVariantDto[] = [],
  legacySpecsJson?: unknown,
  categorySlug?: string,
): ProductDetailPayload {
  const slug = categorySlug?.trim() || product.cat;
  const { specs, specItems, groupedSpecs, attributes } = buildProductDetailSpecPresentation(
    schemaRows,
    attributeValues,
    legacySpecsJson ?? product.specs,
    locale,
    slug,
  );

  return {
    product: { ...product, specs },
    specs,
    groupedSpecs,
    specRows: specItems,
    attributes,
    variants,
  };
}
