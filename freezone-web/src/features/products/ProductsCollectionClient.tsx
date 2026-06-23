"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Trans } from "react-i18next";
import type { Product, Category } from "@/lib/data";
import { FilterSidebar, type FilterState } from "@/components/layout/FilterSidebar";
import { ProductCard } from "@/components/ui/ProductCard";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { facetDefinitionsForCategory, productMatchesFacetSelections } from "@/lib/productFacetConfig";
import { productBelongsToCategoryTree } from "@/lib/productCategoryMembership";
import {
  evaluateProductCatalogSearch,
  tokenizeSearchQueryDisplay,
  type ProductCatalogSearchMatch,
} from "@/lib/productSearch";
import {
  FACET_ADMIN_LABEL_AR,
  FACET_ADMIN_LABEL_EN,
  FACET_UI_GROUPS,
} from "@/lib/facet-admin-labels";
import productsStyles from "./products.module.css";
import collStyles from "./collection.module.css";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useLocale, useTranslations } from "@/i18n/hooks";
import {
  fetchCatalogProducts,
  fetchCatalogFacets,
  type CatalogProductsQuery,
} from "@/lib/catalog-products-api";
import { facetValueForFilter } from "@/lib/classification/legacy-spec-map";
import { sanitizeFacetFilterToken, formatFacetFilterLabel } from "@/lib/classification/facet-filter-token";
import { getFacetDisplayLabel } from "@/lib/catalog-facet-ui";
import { MotionReveal } from "@/components/motion/MotionReveal";
export type SortOption = "featured" | "relevant" | "price-asc" | "price-desc" | "date-new" | "date-old";

const SORT_OPTIONS: readonly SortOption[] = [
  "featured",
  "relevant",
  "price-asc",
  "price-desc",
  "date-new",
  "date-old",
];

/** Honor a shared ?sort= URL on mount (server applies it in SQL across pages). */
function parseSortParam(raw: string | null): SortOption {
  return raw && (SORT_OPTIONS as readonly string[]).includes(raw) ? (raw as SortOption) : "relevant";
}

/** Matches the server default in catalog-filter.ts — both paths page in lockstep. */
const LISTING_PAGE_SIZE = 48;

function parsePageParam(raw: string | null): number {
  return Math.max(1, parseInt(raw ?? "1", 10) || 1);
}

/** Stringify the params without `page` — used to reset paging on filter change. */
function withoutPage(sp: URLSearchParams): string {
  const copy = new URLSearchParams(sp);
  copy.delete("page");
  copy.sort();
  return copy.toString();
}

function parseCsvValues(values: string[]): string[] {
  const out: string[] = [];
  for (const raw of values) {
    if (!raw) continue;
    for (const token of raw.split(",")) {
      const v = token.trim();
      if (v) out.push(v);
    }
  }
  return Array.from(new Set(out));
}

function parsePriceParam(raw: string | null): { pMin: string; pMax: string } {
  if (!raw) return { pMin: "", pMax: "" };
  const [minRaw, maxRaw] = raw.split("-", 2);
  const pMin = minRaw?.trim() ?? "";
  const pMax = maxRaw?.trim() ?? "";
  return { pMin, pMax };
}

function countActiveFilters(f: FilterState, query: string): number {
  let n = 0;
  const q = query.trim();
  if (q) n++;
  if (f.brands.length) n++;
  if (f.pMin || f.pMax) n++;
  if (f.inStock) n++;
  if (f.listingAge !== "all") n++;
  if (f.onSale) n++;
  if (f.featured) n++;
  if (f.cat) n++;
  if (!q) {
    Object.values(f.specSelections).forEach((arr) => {
      n += arr.length;
    });
  }
  return n;
}

function applySort(products: Product[], sort: SortOption): Product[] {
  const arr = [...products];
  switch (sort) {
    case "price-asc":
      return arr.sort((a, b) => a.price - b.price);
    case "price-desc":
      return arr.sort((a, b) => b.price - a.price);
    case "date-new":
      return arr.sort((a, b) => b.id - a.id);
    case "date-old":
      return arr.sort((a, b) => a.id - b.id);
    case "featured":
      return arr.sort((a, b) => (b.featured === a.featured ? 0 : b.featured ? 1 : -1));
    case "relevant":
    default:
      return arr.sort((a, b) => a.name.localeCompare(b.name));
  }
}

type InnerProps = {
  products: Product[];
  categories: Category[];
  initialCat: string;
  initialBrand: string;
  initialFeatured: boolean;
};

type ProductsTranslate = (key: string, opt?: Record<string, string>) => string;

function cardSearchLines(
  ev: ProductCatalogSearchMatch,
  locale: "en" | "ar",
  t: ProductsTranslate,
): { line1: string; line2?: string } {
  const groupTitles = ev.groupIds
    .map((id) => {
      const g = FACET_UI_GROUPS.find((x) => x.id === id);
      return locale === "ar" ? g?.titleAr : g?.titleEn;
    })
    .filter(Boolean) as string[];

  const specBits = ev.explainingKeys
    .slice(0, 4)
    .map((k) => (locale === "ar" ? FACET_ADMIN_LABEL_AR[k] : FACET_ADMIN_LABEL_EN[k]))
    .filter(Boolean);

  const sep = locale === "ar" ? "، " : ", ";
  if (groupTitles.length > 0) {
    const line1 = t("searchMatchedIn", { group: groupTitles[0] });
    const restGroups = groupTitles.slice(1).join(sep);
    const specsLine =
      specBits.length > 0 ? t("searchMatchedVia", { list: specBits.join(sep) }) : undefined;
    if (restGroups) return { line1, line2: `${t("searchAlsoMatches", { list: restGroups })}${specsLine ? ` · ${specsLine}` : ""}` };
    if (specBits.length > 1 || (specBits.length === 1 && ev.explainingKeys.length > 1))
      return { line1, line2: t("searchMatchedVia", { list: specBits.join(sep) }) };
    return { line1 };
  }

  if (specBits.length > 0) {
    return { line1: t("searchMatchedVia", { list: specBits.join(sep) }) };
  }
  return { line1: t("searchMatchedCatalog") };
}

function ProductsInner({ products: allProducts, categories, initialCat, initialBrand, initialFeatured }: InnerProps) {
  const t = useTranslations("Products");
  const locale = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = searchParams.get("cat") ?? initialCat;
  const brandParams = parseCsvValues(searchParams.getAll("brand"));
  const featuredParam = searchParams.get("featured") === "true" || initialFeatured;
  const inStockParam = searchParams.get("inStock") === "true";
  const onSaleParam = searchParams.get("onSale") === "true";
  const isNewParam = searchParams.get("isNew") === "true";
  const listingAgeParam = (searchParams.get("listingAge") as FilterState["listingAge"] | null) ?? (isNewParam ? "new" : "all");
  const qParam = searchParams.get("q") ?? "";
  const pageParam = parsePageParam(searchParams.get("page"));
  const { pMin: pMinParam, pMax: pMaxParam } = parsePriceParam(searchParams.get("price"));

  const categoryMeta = categories.find((c) => c.id === catParam);
  const dynamicFacetKeys =
    categoryMeta?.facetAttributes?.length ? categoryMeta.facetAttributes : categoryMeta?.facetKeys ?? null;
  const facetDefs = facetDefinitionsForCategory(catParam, dynamicFacetKeys);

  const initialBrands =
    brandParams.length > 0 ? brandParams : initialBrand ? [initialBrand] : [];
  const initialSpecSelections = facetDefs.reduce<Record<string, string[]>>((acc, def) => {
    const fromUrl = parseCsvValues(searchParams.getAll(def.key))
      .map((v) => sanitizeFacetFilterToken(def.key, facetValueForFilter(def.key, v) ?? v))
      .filter((v): v is string => Boolean(v));
    if (fromUrl.length > 0) acc[def.key] = fromUrl;
    return acc;
  }, {});

  const [query, setQuery] = useState(qParam);
  const [sortBy, setSortBy] = useState<SortOption>(() => parseSortParam(searchParams.get("sort")));

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    cat: catParam || "",
    brands: initialBrands,
    pMin: pMinParam,
    pMax: pMaxParam,
    inStock: inStockParam,
    listingAge: listingAgeParam === "new" || listingAgeParam === "older" ? listingAgeParam : "all",
    onSale: onSaleParam,
    featured: featuredParam,
    specSelections: initialSpecSelections,
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const trimmedQuery = query.trim();
          if (trimmedQuery) next.set("q", trimmedQuery);
          else next.delete("q");

          if (filters.cat) next.set("cat", filters.cat);
          else next.delete("cat");

          next.delete("brand");
          for (const b of filters.brands) next.append("brand", b);

          if (filters.featured) next.set("featured", "true");
          else next.delete("featured");

          if (filters.inStock) next.set("inStock", "true");
          else next.delete("inStock");
          if (filters.onSale) next.set("onSale", "true");
          else next.delete("onSale");
          if (filters.listingAge === "new") {
            next.set("isNew", "true");
            next.set("listingAge", "new");
          } else if (filters.listingAge === "older") {
            next.delete("isNew");
            next.set("listingAge", "older");
          } else {
            next.delete("isNew");
            next.delete("listingAge");
          }

          if (sortBy !== "featured" && sortBy !== "relevant") next.set("sort", sortBy);
          else next.delete("sort");

          const pMin = filters.pMin.trim();
          const pMax = filters.pMax.trim();
          if (pMin || pMax) next.set("price", `${pMin || "0"}-${pMax || ""}`);
          else next.delete("price");

          for (const def of facetDefs) {
            const values = filters.specSelections[def.key] ?? [];
            if (values.length > 0) next.set(def.key, values.join(","));
            else next.delete(def.key);
          }

          if (next.toString() === prev.toString()) return prev;
          /** Any filter/search/sort change restarts paging from page 1. */
          if (withoutPage(next) !== withoutPage(prev)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => window.clearTimeout(id);
  }, [query, filters, facetDefs, sortBy, setSearchParams]);

  const clearFilters = () => {
    setFilters({
      cat: catParam || "",
      brands: [],
      pMin: "",
      pMax: "",
      inStock: false,
      listingAge: "all",
      onSale: false,
      featured: false,
      specSelections: {},
    });
    setQuery("");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("q");
        return next;
      },
      { replace: true },
    );
  };

  const catalogQuery: CatalogProductsQuery = useMemo(
    () => ({
      locale,
      cat: filters.cat || undefined,
      brands: filters.brands.length ? filters.brands : undefined,
      priceMin: filters.pMin.trim() || undefined,
      priceMax: filters.pMax.trim() || undefined,
      inStock: filters.inStock || undefined,
      onSale: filters.onSale || undefined,
      featured: filters.featured || undefined,
      isNew: filters.listingAge === "new" ? true : undefined,
      listingAge: filters.listingAge,
      q: query.trim() || undefined,
      sort: sortBy,
      page: pageParam,
      facets: filters.specSelections,
    }),
    [locale, filters, query, sortBy, pageParam],
  );

  /**
   * Always use the server-side paginated API for the listing — even on the bare
   * /products view — so the product GRID is one page from the DB (skip/take in
   * SQL), never a client-side filter/sort/slice over the full in-memory catalog.
   * The in-memory `allProducts` array is kept only as (a) the source for the
   * sidebar's brand/availability OPTION lists and (b) a graceful fallback while
   * the first page is loading or if the request fails. The heavy browse work no
   * longer depends on the full catalog.
   */
  const useServerCatalog = true;

  const serverCatalog = useQuery({
    queryKey: ["catalog-products", catalogQuery],
    queryFn: () => fetchCatalogProducts(catalogQuery),
    enabled: useServerCatalog,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const facetPoolQuery = useMemo(
    () => ({
      ...catalogQuery,
      facets: undefined as Record<string, string[]> | undefined,
      /** Facet pools are page-independent — keep the query key stable across pages. */
      page: undefined as number | undefined,
    }),
    [catalogQuery],
  );

  const serverFacetDefs = useQuery({
    queryKey: ["catalog-facets", facetPoolQuery],
    queryFn: () => fetchCatalogFacets(facetPoolQuery),
    enabled: Boolean(filters.cat),
    staleTime: 30_000,
  });

  const { filtered, searchMatchById } = useMemo(() => {
    if (useServerCatalog && serverCatalog.data) {
      const r = serverCatalog.data.products;
      const matchById = new Map<number, ProductCatalogSearchMatch>();
      if (query.trim()) {
        for (const p of r) {
          const ev = evaluateProductCatalogSearch(p, categories, query);
          if (ev?.matches) matchById.set(p.id, ev);
        }
      }
      return { filtered: r, searchMatchById: matchById };
    }
    let r = [...allProducts];
    const q = query.trim();
    const matchById = new Map<number, ProductCatalogSearchMatch>();

    if (q) {
      r = r.filter((p) => {
        const ev = evaluateProductCatalogSearch(p, categories, query);
        if (!ev?.matches) return false;
        matchById.set(p.id, ev);
        return true;
      });
    }

    if (filters.cat) r = r.filter((p) => productBelongsToCategoryTree(p, filters.cat, categories));
    if (filters.brands.length) r = r.filter((p) => filters.brands.includes(p.brand));
    if (filters.inStock) r = r.filter((p) => p.inStock);
    if (filters.listingAge === "new") r = r.filter((p) => p.isNew);
    if (filters.listingAge === "older") r = r.filter((p) => !p.isNew);
    if (filters.onSale) r = r.filter((p) => p.oldPrice != null);
    if (filters.featured) r = r.filter((p) => p.featured);
    if (filters.pMin) r = r.filter((p) => p.price >= Number(filters.pMin));
    if (filters.pMax) r = r.filter((p) => p.price <= Number(filters.pMax));
    if (filters.cat) {
      const catMeta = categories.find((c) => c.id === filters.cat);
      const fk = catMeta?.facetAttributes?.length ? catMeta.facetAttributes : catMeta?.facetKeys;
      r = r.filter((p) => productMatchesFacetSelections(p, filters.cat, filters.specSelections, fk));
    }

    if (q && sortBy === "relevant") {
      const arr = [...r];
      arr.sort((a, b) => {
        const sa = matchById.get(a.id)?.score ?? 0;
        const sb = matchById.get(b.id)?.score ?? 0;
        if (sb !== sa) return sb - sa;
        return a.name.localeCompare(b.name);
      });
      r = arr;
    } else {
      r = applySort(r, sortBy);
    }

    return { filtered: r, searchMatchById: matchById };
  }, [query, filters, sortBy, allProducts, categories, useServerCatalog, serverCatalog.data]);

  const displayCount = useServerCatalog && serverCatalog.data ? serverCatalog.data.total : filtered.length;
  const serverFacets = serverCatalog.data?.facets;
  const serverFacetFilters = serverFacetDefs.data?.filters;
  const catalogLoading = useServerCatalog && serverCatalog.isFetching && !serverCatalog.data;

  /**
   * When a server page is present it is already the requested slice; otherwise
   * (first load still pending, or the request failed before any page cached) we
   * fall back to the in-memory list and MUST slice it locally — rendering the
   * whole `filtered` array unsliced would dump the entire catalog into the DOM
   * with broken pagination. Gating on `serverCatalog.data` keeps the fallback
   * paginated exactly like the legacy client path.
   */
  const serverPaged = useServerCatalog && Boolean(serverCatalog.data);
  const pageSize = serverCatalog.data ? serverCatalog.data.pageSize : LISTING_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(displayCount / pageSize));
  const pagedProducts = serverPaged
    ? filtered
    : filtered.slice((pageParam - 1) * LISTING_PAGE_SIZE, pageParam * LISTING_PAGE_SIZE);

  const goToPage = useCallback(
    (p: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (p > 1) next.set("page", String(p));
        else next.delete("page");
        if (next.toString() === prev.toString()) return prev;
        return next;
      });
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    },
    [setSearchParams],
  );

  /** A stale ?page beyond the last page (e.g. shared URL) folds back to the last page. */
  useEffect(() => {
    if (pageParam > pageCount && !(useServerCatalog && serverCatalog.isFetching)) {
      goToPage(pageCount);
    }
  }, [pageParam, pageCount, useServerCatalog, serverCatalog.isFetching, goToPage]);

  const queryChips = useMemo(() => tokenizeSearchQueryDisplay(query), [query]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === filters.cat),
    [categories, filters.cat],
  );

  const filterChips = useMemo(() => {
    const chips: { key: string; label: string; remove: () => void }[] = [];
    if (filters.inStock) {
      chips.push({
        key: "inStock",
        label: t("inStock"),
        remove: () => setFilters((p) => ({ ...p, inStock: false })),
      });
    }
    if (filters.onSale) {
      chips.push({
        key: "onSale",
        label: t("onSale"),
        remove: () => setFilters((p) => ({ ...p, onSale: false })),
      });
    }
    if (filters.featured) {
      chips.push({
        key: "featured",
        label: t("featured"),
        remove: () => setFilters((p) => ({ ...p, featured: false })),
      });
    }
    if (filters.pMin || filters.pMax) {
      chips.push({
        key: "price",
        label: `${filters.pMin || "0"} – ${filters.pMax || "∞"}`,
        remove: () => setFilters((p) => ({ ...p, pMin: "", pMax: "" })),
      });
    }
    for (const b of filters.brands) {
      chips.push({
        // "brand:" prefix — a category spec facet keyed "brand" would otherwise
        // collide with this chip's key (`brand-X` === `${facetKey}-${token}`).
        key: `brand:${b}`,
        label: b,
        remove: () => setFilters((p) => ({ ...p, brands: p.brands.filter((x) => x !== b) })),
      });
    }
    for (const [facetKey, vals] of Object.entries(filters.specSelections)) {
      for (const v of vals) {
        const token = sanitizeFacetFilterToken(facetKey, v) ?? v;
        chips.push({
          key: `spec:${facetKey}:${token}`,
          label: `${getFacetDisplayLabel(facetKey, locale)}: ${formatFacetFilterLabel(facetKey, token, undefined, locale)}`,
          remove: () =>
            setFilters((p) => {
              const cur = p.specSelections[facetKey] ?? [];
              const next = cur.filter((x) => x !== v && x !== token);
              const nextSpecs = { ...p.specSelections };
              if (next.length) nextSpecs[facetKey] = next;
              else delete nextSpecs[facetKey];
              return { ...p, specSelections: nextSpecs };
            }),
        });
      }
    }
    return chips;
  }, [filters, locale, t, setFilters]);

  const removeQueryChip = (chip: string) => {
    const next = queryChips.filter((c) => c !== chip);
    setQuery(next.join(" "));
  };

  const activeCount = countActiveFilters(filters, query);

  const filterAside = (
    <FilterSidebar
      filters={filters}
      setFilters={setFilters}
      clearFilters={clearFilters}
      products={allProducts}
      categories={categories}
      serverFacets={serverFacets}
      serverFacetFilters={serverFacetFilters}
    />
  );

  return (
    <>
      <MotionReveal delay={0.04} className={`container ${collStyles.collectionWide} ${productsStyles.productsPageShell}`}>
        {activeCategory ? (
          <header className={collStyles.collectionHeader}>
            <h1 className={`fz-type-h1 ${collStyles.collectionTitle}`}>
              {locale === "ar" ? activeCategory.nameAr || activeCategory.name : activeCategory.name}
            </h1>
            <p className={collStyles.collectionMeta}>
              <Trans
                i18nKey="Products.showingResults"
                values={{ count: displayCount }}
                components={{ b: <strong /> }}
              />
            </p>
          </header>
        ) : null}
        <div className={collStyles.toolbar}>
          <div className={collStyles.toolbarLeft}>
            <button
              type="button"
              className={collStyles.filterToggle}
              onClick={() => setMobileFilterOpen(true)}
              aria-expanded={mobileFilterOpen}
            >
              <SlidersHorizontal size={18} />
              {t("filterMobile")}
              {activeCount > 0 && <span className={collStyles.badgeCount}>{activeCount}</span>}
            </button>
            <div className={collStyles.sortWrap}>
              <span className={collStyles.sortLabel}>{t("sortBy")}</span>
              <select
                className={collStyles.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label={t("sortBy")}
              >
                <option value="featured">{t("sortFeatured")}</option>
                <option value="relevant">{t("sortRelevant", { defaultValue: "Name A–Z" })}</option>
                <option value="price-asc">{t("sortPriceLow")}</option>
                <option value="price-desc">{t("sortPriceHigh")}</option>
                <option value="date-new">{t("sortNew")}</option>
                <option value="date-old">{t("sortOld")}</option>
              </select>
            </div>
          </div>
          <span className={collStyles.resultInline}>
            <Trans
              i18nKey="Products.showingResults"
              values={{ count: displayCount }}
              components={{ b: <strong /> }}
            />
          </span>
        </div>

        <div className={collStyles.layoutGrid}>
          <div className={collStyles.sidebarDesktop}>{filterAside}</div>

          <div className={productsStyles.mainCol}>
            {filterChips.length > 0 ? (
              <div className={collStyles.activeChips} role="list" aria-label={t("activeFiltersAria", { defaultValue: "Active filters" })}>
                {filterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    role="listitem"
                    className={collStyles.filterChip}
                    onClick={chip.remove}
                  >
                    {chip.label}
                    <X size={12} aria-hidden />
                  </button>
                ))}
                <button type="button" className={collStyles.clearChipsBtn} onClick={clearFilters}>
                  {t("clearFilters")}
                </button>
              </div>
            ) : null}
            <div className={productsStyles.topBar}>
              <div className={productsStyles.searchColumn}>
                <div className={productsStyles.searchWrapper}>
                  <Search className={productsStyles.searchIcon} size={17} />
                  <input
                    type="search"
                    placeholder={t("searchPlaceholder")}
                    className={productsStyles.searchInput}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label={t("searchPlaceholder")}
                  />
                </div>
                {query.trim() && !filters.cat ? (
                  <p className={productsStyles.searchCrossHint} dir={locale === "ar" ? "rtl" : "ltr"}>
                    {t("searchCrossCategoryHint")}
                  </p>
                ) : null}
                {queryChips.length > 0 ? (
                  <div className={productsStyles.queryChips} role="list" aria-label={t("searchRefineAria")}>
                    {queryChips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        role="listitem"
                        className={productsStyles.queryChip}
                        onClick={() => removeQueryChip(chip)}
                      >
                        {chip}
                        <X size={12} className={productsStyles.queryChipIcon} aria-hidden />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {catalogLoading ? (
              <div className={productsStyles.noResults}>
                <p>{t("loadingResults", { defaultValue: "Loading…" })}</p>
              </div>
            ) : null}
            {!catalogLoading && displayCount === 0 ? (
              <div className={productsStyles.noResults}>
                <span className={productsStyles.noResultsEmoji} aria-hidden>
                  🔍
                </span>
                <h3 className={productsStyles.noResultsTitleBilingual}>
                  <span className={productsStyles.noResultsLang}>No results</span>
                  <span className={productsStyles.noResultsLang} dir="rtl" lang="ar">
                    لا توجد نتائج
                  </span>
                </h3>
                <p>{t("noResultsSub")}</p>
                <button type="button" className="btn-outline" onClick={clearFilters}>
                  {t("clearFilters")}
                </button>
              </div>
            ) : (
              <>
                <div className={productsStyles.grid}>
                  {pagedProducts.map((p, i) => {
                    const ev = searchMatchById.get(p.id);
                    const specSearchLines = ev ? cardSearchLines(ev, locale, t) : undefined;
                    return (
                      <ProductCard key={p.id} product={p} categories={categories} delay={i * 25} specSearchLines={specSearchLines} />
                    );
                  })}
                </div>
                <PaginationControls page={pageParam} pageCount={pageCount} onPageChange={goToPage} />
              </>
            )}
          </div>
        </div>
      </MotionReveal>

      <div
        className={`${collStyles.drawerBackdrop} ${mobileFilterOpen ? collStyles.open : ""}`}
        onClick={() => setMobileFilterOpen(false)}
        aria-hidden="true"
      />
      <div className={`${collStyles.drawerPanel} ${mobileFilterOpen ? collStyles.open : ""}`} role="dialog" aria-modal="true">
        <div className={collStyles.drawerHeader}>
          {t("filterTitle")}
          <button type="button" className={collStyles.drawerClose} onClick={() => setMobileFilterOpen(false)} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className={collStyles.drawerBody}>{filterAside}</div>
        <div className={collStyles.drawerFooter}>
          <button type="button" className={collStyles.clearInline} onClick={clearFilters}>
            {t("clearFilters")}
          </button>
          <button type="button" className={collStyles.applyBtn} onClick={() => setMobileFilterOpen(false)}>
            {t("applyFilters")} {activeCount > 0 ? `(${activeCount})` : ""}
          </button>
        </div>
      </div>
    </>
  );
}

export function ProductsCollectionClient(props: {
  products: Product[];
  categories: Category[];
  initialCat: string;
  initialBrand: string;
  initialFeatured: boolean;
}) {
  const [searchParams] = useSearchParams();
  const brandsFromUrl = searchParams.getAll("brand");
  const brandKey =
    brandsFromUrl.length > 0 ? [...brandsFromUrl].sort().join(",") : props.initialBrand || "";
  const remountKey = [
    searchParams.get("cat") ?? props.initialCat,
    brandKey,
    searchParams.get("featured") ?? (props.initialFeatured ? "true" : ""),
  ].join("|");

  return <ProductsInner key={remountKey} {...props} />;
}
