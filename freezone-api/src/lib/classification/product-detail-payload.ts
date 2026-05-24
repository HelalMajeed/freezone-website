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
  /** Merge product.warranty into the legacy specs blob so the existing PDP hero-specs
   *  builder (which looks up `warranty` by key) renders it even for products that
   *  predate the explicit column. The column remains the source of truth for admin edits. */
  const baseSpecs =
    legacySpecsJson && typeof legacySpecsJson === "object" && !Array.isArray(legacySpecsJson)
      ? (legacySpecsJson as Record<string, unknown>)
      : product.specs;
  const mergedSpecs = product.warranty
    ? { ...(baseSpecs && typeof baseSpecs === "object" ? baseSpecs : {}), warranty: product.warranty }
    : baseSpecs;
  const { specs, specItems, groupedSpecs, attributes } = buildProductDetailSpecPresentation(
    schemaRows,
    attributeValues,
    mergedSpecs,
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
