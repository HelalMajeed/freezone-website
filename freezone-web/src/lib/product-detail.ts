import type { Product, FacetAttributeDef } from "./data";
import { PRODUCTS } from "./data";
import { freezoneApiUrl, getInternalApiFetchSignal } from "./api-internal";
import { isDatabaseConfigured } from "./prisma";
import type { LocaleCode } from "./catalog";

export type ProductDetailSpecItem = {
  key: string;
  label: string;
  value: string;
  displayGroup: string;
};

export type ProductDetailSpecGroup = {
  group: string;
  groupLabel: { en: string; ar: string };
  items: ProductDetailSpecItem[];
};

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

export async function getProductDetail(
  id: number,
  locale: LocaleCode,
): Promise<ProductDetailPayload | null> {
  if (!isDatabaseConfigured()) {
    const product = PRODUCTS.find((p) => p.id === id) ?? null;
    if (!product) return null;
    return {
      product,
      specs: product.specs ?? {},
      groupedSpecs: [],
      specRows: [],
      attributes: [],
      variants: [],
    };
  }
  try {
    const r = await fetch(freezoneApiUrl(`/api/ssr/product/${id}?locale=${locale}`), {
      signal: getInternalApiFetchSignal(),
      credentials: "omit",
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as ProductDetailPayload | null;
    if (!data?.product) return null;
    return data;
  } catch {
    const product = PRODUCTS.find((p) => p.id === id) ?? null;
    if (!product) return null;
    return {
      product,
      specs: product.specs ?? {},
      groupedSpecs: [],
      specRows: [],
      attributes: [],
      variants: [],
    };
  }
}
