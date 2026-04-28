import type { Product } from "@/lib/data";
import { productBelongsToCategory } from "@/lib/productCategoryMembership";

/** How products are chosen for a tab or a featured-products block */
export type ProductTabMode = "new" | "featured" | "gaming" | "components" | "cat" | "manual";

export type TabbedProductTabConfig = {
  id: string;
  labelAr: string;
  labelEn: string;
  mode: ProductTabMode;
  catSlug?: string;
  productIds?: number[];
  /** Override "view all" link for this tab */
  viewAllLink?: string;
};

export type TabbedProductsPayload = {
  eyebrowAr?: string;
  eyebrowEn?: string;
  titleAr?: string;
  titleEn?: string;
  /** Default link when a tab has no `viewAllLink` */
  viewAllLink?: string;
  limit?: number;
  /** `grouped` = single pill container (reference UI); `separated` = individual bordered chips */
  tabStyle?: "grouped" | "separated";
  tabs: TabbedProductTabConfig[];
};

function clampLimit(n: number | undefined) {
  return Math.min(48, Math.max(1, typeof n === "number" && !Number.isNaN(n) ? n : 24));
}

export function getProductsForTab(products: Product[], tab: TabbedProductTabConfig, limit?: number): Product[] {
  const lim = clampLimit(limit);
  if (tab.mode === "manual" && Array.isArray(tab.productIds) && tab.productIds.length > 0) {
    return tab.productIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => p != null)
      .slice(0, lim);
  }
  switch (tab.mode) {
    case "new":
      return products.filter((p) => p.isNew).slice(0, lim);
    case "featured":
      return products.filter((p) => p.featured).slice(0, lim);
    case "gaming":
      return products
        .filter((p) => ["gaming", "laptops", "computers"].some((slug) => productBelongsToCategory(p, slug)))
        .slice(0, lim);
    case "components":
      return products
        .filter((p) => productBelongsToCategory(p, "components") || productBelongsToCategory(p, "storage"))
        .slice(0, lim);
    case "cat": {
      const slug = (tab.catSlug ?? "").trim();
      if (!slug) return [];
      return products.filter((p) => productBelongsToCategory(p, slug)).slice(0, lim);
    }
    default:
      return products.slice(0, lim);
  }
}

export function defaultViewAllHrefForTab(tab: TabbedProductTabConfig, fallback: string): string {
  if (tab.viewAllLink?.trim()) return tab.viewAllLink.trim();
  switch (tab.mode) {
    case "new":
      return "/products?isNew=true";
    case "featured":
      return "/products?featured=true";
    case "gaming":
      return "/products?cat=gaming";
    case "components":
      return "/products?cat=components";
    case "cat": {
      const s = (tab.catSlug ?? "").trim();
      return s ? `/products?cat=${encodeURIComponent(s)}` : fallback || "/products";
    }
    case "manual":
      return fallback || "/products";
    default:
      return fallback || "/products";
  }
}

export function parseTabbedProductsPayload(raw: unknown): TabbedProductsPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const tabsIn = o.tabs;
  if (!Array.isArray(tabsIn) || tabsIn.length === 0) return null;
  const tabs: TabbedProductTabConfig[] = [];
  for (let i = 0; i < tabsIn.length; i++) {
    const t = tabsIn[i];
    if (!t || typeof t !== "object" || Array.isArray(t)) continue;
    const r = t as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : `tab-${i}`;
    const labelAr = typeof r.labelAr === "string" ? r.labelAr : "";
    const labelEn = typeof r.labelEn === "string" ? r.labelEn : "";
    const mode = (typeof r.mode === "string" ? r.mode : "new") as ProductTabMode;
    const catSlug = typeof r.catSlug === "string" ? r.catSlug : undefined;
    let productIds: number[] | undefined;
    if (Array.isArray(r.productIds)) {
      productIds = r.productIds.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    }
    const viewAllLink = typeof r.viewAllLink === "string" ? r.viewAllLink : undefined;
    tabs.push({ id, labelAr, labelEn, mode, catSlug, productIds, viewAllLink });
  }
  if (tabs.length === 0) return null;
  const tabStyle = o.tabStyle === "separated" ? "separated" : "grouped";
  return {
    eyebrowAr: typeof o.eyebrowAr === "string" ? o.eyebrowAr : undefined,
    eyebrowEn: typeof o.eyebrowEn === "string" ? o.eyebrowEn : undefined,
    titleAr: typeof o.titleAr === "string" ? o.titleAr : undefined,
    titleEn: typeof o.titleEn === "string" ? o.titleEn : undefined,
    viewAllLink: typeof o.viewAllLink === "string" ? o.viewAllLink : undefined,
    limit: typeof o.limit === "number" ? o.limit : undefined,
    tabStyle,
    tabs,
  };
}

export function resolveFeaturedProductList(
  products: Product[],
  filter: string,
  catSlug: string | undefined,
  limit: number,
  productIds?: number[],
): Product[] {
  const lim = Math.min(48, Math.max(1, limit || 12));
  if (productIds && productIds.length > 0) {
    return productIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => p != null)
      .slice(0, lim);
  }
  let list = products;
  if (filter === "new") list = products.filter((p) => p.isNew);
  else if (filter === "featured") list = products.filter((p) => p.featured);
  else if (filter === "cat" && catSlug) {
    const slugs = catSlug
      .split(/[,،\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (slugs.length === 0) list = [];
    else if (slugs.length === 1) list = products.filter((p) => productBelongsToCategory(p, slugs[0]!));
    else list = products.filter((p) => slugs.some((slug) => productBelongsToCategory(p, slug)));
  }
  return list.slice(0, lim);
}
