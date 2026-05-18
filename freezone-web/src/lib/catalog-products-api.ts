import type { Product } from "@/lib/data";
import { freezoneApiUrl } from "@/lib/api-internal";

export type FacetCount = { value: string; count: number };

export type CatalogProductsResponse = {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  facets: Record<string, FacetCount[]>;
};

export type CatalogProductsQuery = {
  locale: "en" | "ar";
  cat?: string;
  brands?: string[];
  priceMin?: string;
  priceMax?: string;
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  isNew?: boolean;
  listingAge?: string;
  q?: string;
  sort?: string;
  page?: number;
  facets?: Record<string, string[]>;
};

function buildCatalogProductsUrl(q: CatalogProductsQuery): string {
  const sp = new URLSearchParams();
  sp.set("locale", q.locale);
  if (q.cat) sp.set("cat", q.cat);
  if (q.brands?.length) for (const b of q.brands) sp.append("brand", b);
  if (q.priceMin || q.priceMax) sp.set("price", `${q.priceMin || "0"}-${q.priceMax || ""}`);
  if (q.inStock) sp.set("inStock", "true");
  if (q.onSale) sp.set("onSale", "true");
  if (q.featured) sp.set("featured", "true");
  if (q.isNew) sp.set("isNew", "true");
  if (q.listingAge && q.listingAge !== "all") sp.set("listingAge", q.listingAge);
  if (q.q?.trim()) sp.set("q", q.q.trim());
  if (q.sort) sp.set("sort", q.sort);
  if (q.page && q.page > 1) sp.set("page", String(q.page));
  if (q.facets) {
    for (const [key, vals] of Object.entries(q.facets)) {
      if (vals.length) sp.set(key, vals.join(","));
    }
  }
  return freezoneApiUrl(`/api/ssr/catalog/products?${sp.toString()}`);
}

export function catalogUsesFilteredApi(q: CatalogProductsQuery): boolean {
  return Boolean(
    q.cat ||
      q.brands?.length ||
      q.priceMin ||
      q.priceMax ||
      q.inStock ||
      q.onSale ||
      q.featured ||
      q.isNew ||
      (q.listingAge && q.listingAge !== "all") ||
      q.q?.trim() ||
      (q.sort && q.sort !== "featured" && q.sort !== "relevant") ||
      (q.facets && Object.values(q.facets).some((v) => v.length > 0)),
  );
}

export async function fetchCatalogProducts(q: CatalogProductsQuery): Promise<CatalogProductsResponse> {
  const url = buildCatalogProductsUrl(q);
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`catalog products ${res.status}`);
  return res.json() as Promise<CatalogProductsResponse>;
}
