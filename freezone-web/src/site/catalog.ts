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
  /** Text each product is searched by (both languages, model, brand, section), as searchKey() writes it. */
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

/**
 * Text as it is compared in search: lower case, no layout marks, no Arabic
 * diacritics, and the letter variants people type interchangeably folded
 * together (أ إ آ → ا, ة → ه, ى → ي), Arabic-Indic digits → 0-9.
 */
export function searchKey(s: string): string {
  return plainText(s)
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0649/g, "\u064A")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u2010-\u2015]/g, "-");
}

/** The words of a search, ready to compare ("hikvision 4mp" → ["hikvision", "4mp"]). */
export function searchWords(q: string): string[] {
  return searchKey(q).split(/[\s,\u060C]+/).filter(Boolean);
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
      searchKey(
        [p.nameAr, p.nameEn, p.model, p.kindAr, p.kindEn, p.brand, sub?.ar, sub?.en, cat?.ar, cat?.en, p.id].join(" "),
      ),
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

/** How the list is ordered: as the catalogue lists it, by price, or new arrivals first. */
export type SortKey = "default" | "price-asc" | "price-desc" | "new";
export const SORT_KEYS: readonly SortKey[] = ["default", "price-asc", "price-desc", "new"];

/** Price ranges offered on the list, in whole dinars; `max` is exclusive, null = no upper end. */
export const PRICE_RANGES: readonly { id: string; min: number; max: number | null }[] = [
  { id: "0-100000", min: 0, max: 100_000 },
  { id: "100000-500000", min: 100_000, max: 500_000 },
  { id: "500000-1500000", min: 500_000, max: 1_500_000 },
  { id: "1500000-3000000", min: 1_500_000, max: 3_000_000 },
  { id: "3000000-", min: 3_000_000, max: null },
];

export type ListFilters = {
  /** "all", a brand name, or "" for other brands. */
  brand: string;
  cat: string;
  sub: string;
  q: string;
  page: number;
  sort: SortKey;
  /** "all" or the id of one of PRICE_RANGES. */
  price: string;
  /** Leave out products marked unavailable. */
  stock: boolean;
};

export const DEFAULT_FILTERS: ListFilters = {
  brand: "all",
  cat: "all",
  sub: "all",
  q: "",
  page: 1,
  sort: "default",
  price: "all",
  stock: false,
};

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
  const rawSort = params.get("sort") ?? "";
  const sort = SORT_KEYS.includes(rawSort as SortKey) ? (rawSort as SortKey) : "default";
  const rawPrice = params.get("price") ?? "";
  const price = PRICE_RANGES.some((r) => r.id === rawPrice) ? rawPrice : "all";
  return {
    brand,
    cat: sub !== "all" && subRow ? subRow.cat : cat,
    sub,
    q: params.get("q") ?? "",
    page,
    sort,
    price,
    stock: params.get("stock") === "1",
  };
}

/** Query string for a set of filters (defaults left out), e.g. "?brand=Hikvision&cat=cctv". */
export function filtersQuery(f: Partial<ListFilters>): string {
  const p = new URLSearchParams();
  if (f.brand !== undefined && f.brand !== "all") p.set("brand", f.brand === "" ? OTHER_BRAND : f.brand);
  if (f.cat && f.cat !== "all") p.set("cat", f.cat);
  if (f.sub && f.sub !== "all") p.set("sub", f.sub);
  if (f.q && f.q.trim()) p.set("q", f.q.trim());
  if (f.sort && f.sort !== "default") p.set("sort", f.sort);
  if (f.price && f.price !== "all") p.set("price", f.price);
  if (f.stock) p.set("stock", "1");
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
  /** Grouped by brand (nothing chosen, searched, sorted or narrowed) instead of one paged grid. */
  sectioned: boolean;
  pages: number;
  page: number;
};

/** Every word of the search appears somewhere in the product's text. */
function matchesWords(catalog: SiteCatalog, p: SiteProduct, words: string[]): boolean {
  const text = catalog.findText.get(p.id) ?? "";
  return words.every((w) => text.includes(w));
}

export type SearchHits = {
  /** Best matches first, at most `limit`. */
  products: SiteProduct[];
  /** How many products match in all. */
  total: number;
  cats: SiteCat[];
  subs: SiteSub[];
  brands: string[];
};

/**
 * Instant search (the header's search panel). Products whose model, brand or
 * type starts with what was typed come before products that only mention it.
 */
export function searchCatalog(catalog: SiteCatalog, q: string, limit = 6): SearchHits {
  const words = searchWords(q);
  if (words.length === 0) return { products: [], total: 0, cats: [], subs: [], brands: [] };
  const whole = words.join(" ");
  const scored: { p: SiteProduct; score: number }[] = [];
  for (const p of catalog.products) {
    if (!matchesWords(catalog, p, words)) continue;
    const model = searchKey(p.model);
    const brand = searchKey(p.brand);
    let score = 0;
    if (model === whole || p.id.toLowerCase() === whole) score += 100;
    else if (model.startsWith(whole)) score += 60;
    else if (model.includes(whole)) score += 30;
    if (words.some((w) => brand && brand.startsWith(w))) score += 20;
    if (words.some((w) => searchKey(p.kindAr).startsWith(w) || searchKey(p.kindEn).startsWith(w))) score += 10;
    if (p.flag === "out") score -= 5;
    scored.push({ p, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const hit = (...labels: string[]) => labels.some((l) => words.every((w) => searchKey(l).includes(w)));
  return {
    products: scored.slice(0, limit).map((x) => x.p),
    total: scored.length,
    cats: catalog.cats.filter((c) => hit(c.ar, c.en)),
    subs: catalog.subs.filter((s) => hit(s.ar, s.en)).slice(0, 4),
    brands: catalog.brands.filter((b) => b && hit(b)),
  };
}

export function buildListView(catalog: SiteCatalog, f: ListFilters): ListView {
  const all = catalog.products;
  const inBrand = f.brand === "all" ? all : all.filter((p) => p.brand === f.brand);
  const ownCats = catalog.cats.filter((c) => inBrand.some((p) => p.cat === c.id));
  const cat = f.cat !== "all" ? f.cat : f.brand !== "all" && ownCats.length === 1 ? ownCats[0].id : "all";
  const inCat = cat === "all" ? inBrand : inBrand.filter((p) => p.cat === cat);
  const ownSubs = catalog.subs.filter((s) => s.cat === cat && inCat.some((p) => p.sub === s.id));
  const words = searchWords(f.q);
  let list = f.sub === "all" ? inCat : inCat.filter((p) => p.sub === f.sub);
  if (words.length) list = list.filter((p) => matchesWords(catalog, p, words));
  const range = PRICE_RANGES.find((r) => r.id === f.price);
  if (range) list = list.filter((p) => p.price >= range.min && (range.max === null || p.price < range.max));
  if (f.stock) list = list.filter((p) => p.flag !== "out");
  if (f.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  else if (f.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
  else if (f.sort === "new") list = [...list].sort((a, b) => Number(b.flag === "new") - Number(a.flag === "new"));
  const sectioned = f.brand === "all" && words.length === 0 && f.sort === "default" && !range && !f.stock;
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
