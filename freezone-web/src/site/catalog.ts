import { useQuery } from "@tanstack/react-query";

/**
 * The storefront catalogue is static data shipped with the site (src/site/data,
 * written by the catalogue export — see README.md in this folder). Nothing here
 * talks to the API: products, prices and pictures change by regenerating the
 * data files and deploying.
 */

export type SiteLocale = "ar" | "en";

export type SiteCat = { id: string; ar: string; en: string };
export type SiteSub = { id: string; cat: string; ar: string; en: string };

export type SiteProduct = {
  /** FZ-001 … — also the picture file name and the product URL. */
  id: string;
  /** "" for items without a brand ("other brands"). */
  brand: string;
  model: string;
  sub: string;
  cat: string;
  nameAr: string;
  nameEn: string;
  /** Card title: the product type without brand and model. */
  kindAr: string;
  kindEn: string;
  /** Selling price, whole Iraqi dinars. */
  price: number;
  flag?: "new" | "out";
};

type RawCatalog = { cats: SiteCat[]; subs: SiteSub[]; brands: string[]; products: SiteProduct[] };

export type SiteCatalog = RawCatalog & {
  byId: Map<string, SiteProduct>;
  catById: Map<string, SiteCat>;
  subById: Map<string, SiteSub>;
  /** Lower-case text each product is searched by (both languages, model, brand, section). */
  findText: Map<string, string>;
};

/** URL value for the "other brands" group (products whose brand is ""). */
export const OTHER_BRAND = "other";

/** Bidi isolates / non-breaking characters the Arabic names carry for layout only. */
export function plainText(s: string): string {
  return s
    .replace(/[\u2066\u2067\u2068\u2069]/g, "")
    .replace(/\u2011/g, "-")
    .replace(/\u00a0/g, " ");
}

export function prepareCatalog(raw: RawCatalog): SiteCatalog {
  const catById = new Map(raw.cats.map((c) => [c.id, c]));
  const subById = new Map(raw.subs.map((s) => [s.id, s]));
  const byId = new Map(raw.products.map((p) => [p.id, p]));
  const findText = new Map<string, string>();
  for (const p of raw.products) {
    const sub = subById.get(p.sub);
    const cat = catById.get(p.cat);
    findText.set(
      p.id,
      plainText(
        [p.nameAr, p.nameEn, p.model, p.kindAr, p.kindEn, p.brand, sub?.ar, sub?.en, cat?.ar, cat?.en, p.id].join(" "),
      ).toLowerCase(),
    );
  }
  return { ...raw, byId, catById, subById, findText };
}

async function loadCatalog(): Promise<SiteCatalog> {
  const mod = await import("./data/catalog.json");
  return prepareCatalog(mod.default as unknown as RawCatalog);
}

/** The whole catalogue (one cached chunk, about 40 KB compressed). */
export function useCatalog() {
  return useQuery({ queryKey: ["site-catalog"], queryFn: loadCatalog, staleTime: Infinity, gcTime: Infinity });
}

async function loadFeatures(locale: SiteLocale): Promise<Record<string, string[]>> {
  const mod = locale === "ar" ? await import("./data/features.ar.json") : await import("./data/features.en.json");
  return mod.default as unknown as Record<string, string[]>;
}

/** Specification lines of every product in one language — loaded on the product page only. */
export function useFeatures(locale: SiteLocale) {
  return useQuery({
    queryKey: ["site-features", locale],
    queryFn: () => loadFeatures(locale),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function productName(p: SiteProduct, locale: SiteLocale): string {
  return locale === "ar" ? p.nameAr : p.nameEn;
}

export function productKind(p: SiteProduct, locale: SiteLocale): string {
  return locale === "ar" ? p.kindAr : p.kindEn;
}

export function labelOf(x: { ar: string; en: string } | undefined, locale: SiteLocale): string {
  return x ? (locale === "ar" ? x.ar : x.en) : "";
}

export function productImage(id: string, size: "full" | "small" = "full"): string {
  return size === "small" ? `/catalog/s/${id}.webp` : `/catalog/${id}.webp`;
}

/** 1540000 → "1,540,000" (Western digits in both languages, as on the price tags). */
export function formatMoney(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * "fz-012" → "FZ-012". Only the letters' case is forgiven — the same rule as the
 * product edge function (netlify/edge-functions/seo-product-404.ts), so a URL
 * never shows a product while answering 404.
 */
export function normalizeProductId(raw: string): string {
  return raw.trim().toUpperCase();
}

/* ── Product list: filters kept in the URL ───────────────────────────────── */

export type ListFilters = {
  /** "all", a brand name, or "" for other brands. */
  brand: string;
  cat: string;
  sub: string;
  q: string;
  page: number;
};

export const DEFAULT_FILTERS: ListFilters = { brand: "all", cat: "all", sub: "all", q: "", page: 1 };

/** Read the filters from a query string, dropping anything the catalogue does not have. */
export function readFilters(catalog: SiteCatalog, params: URLSearchParams): ListFilters {
  const rawBrand = (params.get("brand") ?? "").trim();
  let brand = "all";
  if (rawBrand) {
    if (rawBrand.toLowerCase() === OTHER_BRAND) brand = catalog.brands.includes("") ? "" : "all";
    else brand = catalog.brands.find((b) => b && b.toLowerCase() === rawBrand.toLowerCase()) ?? "all";
  }
  const rawCat = params.get("cat") ?? "";
  const cat = catalog.catById.has(rawCat) ? rawCat : "all";
  const rawSub = params.get("sub") ?? "";
  const subRow = catalog.subById.get(rawSub);
  const sub = subRow && (cat === "all" || subRow.cat === cat) ? rawSub : "all";
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  return { brand, cat: sub !== "all" && subRow ? subRow.cat : cat, sub, q: params.get("q") ?? "", page };
}

/** Query string for a set of filters (defaults left out), e.g. "?brand=Hikvision&cat=cctv". */
export function filtersQuery(f: Partial<ListFilters>): string {
  const p = new URLSearchParams();
  if (f.brand !== undefined && f.brand !== "all") p.set("brand", f.brand === "" ? OTHER_BRAND : f.brand);
  if (f.cat && f.cat !== "all") p.set("cat", f.cat);
  if (f.sub && f.sub !== "all") p.set("sub", f.sub);
  if (f.q && f.q.trim()) p.set("q", f.q.trim());
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const PAGE_SIZE = 20;
/** Products shown per brand while the list is grouped by brand. */
export const SECTION_SIZE = 5;

export type ListView = {
  /** Section in effect: the chosen one, or the only one a chosen brand has. */
  cat: string;
  /** Products of the chosen brand (all products when no brand is chosen). */
  inBrand: SiteProduct[];
  /** …narrowed to the section. */
  inCat: SiteProduct[];
  /** …narrowed to the type and the search text: what the page lists. */
  list: SiteProduct[];
  /** Sections the chosen brand has products in. */
  ownCats: SiteCat[];
  /** Types of the section in effect that have products. */
  ownSubs: SiteSub[];
  /** Grouped by brand (no brand chosen and nothing searched) instead of one paged grid. */
  sectioned: boolean;
  pages: number;
  page: number;
};

export function buildListView(catalog: SiteCatalog, f: ListFilters): ListView {
  const all = catalog.products;
  const inBrand = f.brand === "all" ? all : all.filter((p) => p.brand === f.brand);
  const ownCats = catalog.cats.filter((c) => inBrand.some((p) => p.cat === c.id));
  const cat = f.cat !== "all" ? f.cat : f.brand !== "all" && ownCats.length === 1 ? ownCats[0].id : "all";
  const inCat = cat === "all" ? inBrand : inBrand.filter((p) => p.cat === cat);
  const ownSubs = catalog.subs.filter((s) => s.cat === cat && inCat.some((p) => p.sub === s.id));
  const q = plainText(f.q).trim().toLowerCase();
  let list = f.sub === "all" ? inCat : inCat.filter((p) => p.sub === f.sub);
  if (q) list = list.filter((p) => (catalog.findText.get(p.id) ?? "").includes(q));
  const sectioned = f.brand === "all" && !q;
  const pages = sectioned ? 1 : Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  return { cat, inBrand, inCat, list, ownCats, ownSubs, sectioned, pages, page: Math.min(f.page, pages) };
}

/** Up to five similar products: same type and brand first, then the same type from other brands. */
export function relatedProducts(catalog: SiteCatalog, p: SiteProduct, max = 5): SiteProduct[] {
  const same = catalog.products.filter((x) => x.sub === p.sub && x.brand === p.brand && x.id !== p.id).slice(0, max);
  if (same.length >= max) return same;
  const others = catalog.products.filter((x) => x.sub === p.sub && x.brand !== p.brand).slice(0, max - same.length);
  return same.concat(others);
}
