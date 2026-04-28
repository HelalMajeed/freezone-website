"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Trans } from "react-i18next";
import type { Product, Category } from "@/lib/data";
import { FilterSidebar, type FilterState } from "@/components/layout/FilterSidebar";
import { ProductCard } from "@/components/ui/ProductCard";
import { productMatchesFacetSelections } from "@/lib/productFacetConfig";
import { productBelongsToCategory } from "@/lib/productCategoryMembership";
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
import { MotionReveal } from "@/components/motion/MotionReveal";
export type SortOption = "featured" | "relevant" | "price-asc" | "price-desc" | "date-new" | "date-old";

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
  const brandParams = searchParams.getAll("brand");
  const featuredParam = searchParams.get("featured") === "true" || initialFeatured;
  const qParam = searchParams.get("q") ?? "";

  const initialBrands =
    brandParams.length > 0 ? brandParams : initialBrand ? [initialBrand] : [];

  const [query, setQuery] = useState(qParam);
  const [sortBy, setSortBy] = useState<SortOption>("relevant");

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const trimmed = query.trim();
          if (trimmed) next.set("q", trimmed);
          else next.delete("q");
          return next;
        },
        { replace: true },
      );
    }, 400);
    return () => window.clearTimeout(id);
  }, [query, setSearchParams]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    cat: catParam || "",
    brands: initialBrands,
    pMin: "",
    pMax: "",
    inStock: false,
    listingAge: "all",
    onSale: false,
    featured: featuredParam,
    specSelections: {},
  });

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

  const { filtered, searchMatchById } = useMemo(() => {
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

    if (filters.cat) r = r.filter((p) => productBelongsToCategory(p, filters.cat));
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
  }, [query, filters, sortBy, allProducts, categories]);

  const queryChips = useMemo(() => tokenizeSearchQueryDisplay(query), [query]);

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
    />
  );

  return (
    <>
      <MotionReveal delay={0.04} className={`container ${collStyles.collectionWide} ${productsStyles.productsPageShell}`}>
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
                <option value="relevant">{t("sortRelevant")}</option>
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
              values={{ count: filtered.length }}
              components={{ b: <strong /> }}
            />
          </span>
        </div>

        <div className={collStyles.layoutGrid}>
          <div className={collStyles.sidebarDesktop}>{filterAside}</div>

          <div className={productsStyles.mainCol}>
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

            {filtered.length === 0 ? (
              <div className={productsStyles.noResults}>
                <span style={{ fontSize: "2.5rem" }}>🔍</span>
                <h3 className={productsStyles.noResultsTitleBilingual}>
                  <span className={productsStyles.noResultsLang}>No results</span>
                  <span className={productsStyles.noResultsLang} dir="rtl" lang="ar">
                    لا توجد نتائج
                  </span>
                </h3>
                <p>{t("noResultsSub")}</p>
                <button type="button" className="btn-red" onClick={clearFilters}>
                  {t("clearFilters")}
                </button>
              </div>
            ) : (
              <div className={productsStyles.grid}>
                {filtered.map((p, i) => {
                  const ev = searchMatchById.get(p.id);
                  const specSearchLines = ev ? cardSearchLines(ev, locale, t) : undefined;
                  return (
                    <ProductCard key={p.id} product={p} categories={categories} delay={i * 25} specSearchLines={specSearchLines} />
                  );
                })}
              </div>
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
