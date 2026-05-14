import type { Product, Category, Brand } from "./data";
import { PRODUCTS, CATEGORIES, BRANDS } from "./data";
import { freezoneApiUrl, getInternalApiFetchSignal } from "./api-internal";
import { isDatabaseConfigured } from "./prisma";
import { fetchStorefrontBootstrap } from "./storefront-bootstrap";

export type LocaleCode = "en" | "ar";

export async function getProductsCatalog(locale: LocaleCode): Promise<Product[]> {
  if (!isDatabaseConfigured()) {
    return PRODUCTS;
  }
  return (await fetchStorefrontBootstrap(locale)).catalog.products;
}

export async function getCategoriesCatalog(locale: LocaleCode): Promise<Category[]> {
  if (!isDatabaseConfigured()) {
    return CATEGORIES;
  }
  return (await fetchStorefrontBootstrap(locale)).catalog.categories;
}

export async function getBrandsCatalog(locale: LocaleCode): Promise<Brand[]> {
  if (!isDatabaseConfigured()) {
    return BRANDS;
  }
  return (await fetchStorefrontBootstrap(locale)).catalog.brands;
}

export async function getProductById(id: number, locale: LocaleCode): Promise<Product | null> {
  if (!isDatabaseConfigured()) {
    return PRODUCTS.find((p) => p.id === id) ?? null;
  }
  try {
    const r = await fetch(freezoneApiUrl(`/api/ssr/product/${id}?locale=${locale}`), {
      signal: getInternalApiFetchSignal(),
      credentials: "omit",
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as Product | null;
  } catch {
    return PRODUCTS.find((p) => p.id === id) ?? null;
  }
}
