import { useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { Seo } from "@/components/seo/Seo";
import {
  buildListView,
  filtersQuery,
  formatMoney,
  labelOf,
  PAGE_SIZE,
  PRICE_RANGES,
  readFilters,
  SECTION_SIZE,
  SORT_KEYS,
  useCatalog,
  type ListFilters,
  type SiteCatalog,
  type SortKey,
} from "./catalog";
import { CheckIcon, ChevronDownIcon, ChevronIcon, CloseIcon, SearchIcon } from "./icons";
import { useSitePrefs } from "./prefs";
import { GhostCard, ProductCard } from "./ProductCard";
import styles from "./site.module.css";

/** Filter links keep the page where it is instead of jumping to the top (see ScrollToTop). */
const KEEP_SCROLL = { keepScroll: true } as const;

const SORT_LABEL: Record<SortKey, string> = {
  default: "sortDefault",
  "price-asc": "sortPriceAsc",
  "price-desc": "sortPriceDesc",
  new: "sortNew",
};

/** Page numbers to show: first, last, and the pages around the current one; 0 marks a gap. */
export function pageWindow(page: number, pages: number): number[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  if (page <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => keep.add(n));
  const out: number[] = [];
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (out.length && n - out[out.length - 1] > 1) out.push(0);
    out.push(n);
  }
  return out;
}

function ListSkeleton() {
  return (
    <div className={styles.grid} aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <GhostCard key={i} />
      ))}
    </div>
  );
}

function ProductList({ catalog }: { catalog: SiteCatalog }) {
  const t = useTranslations("Site");
  const locale = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const base = `/${locale}/products`;

  const urlFilters = useMemo(() => readFilters(catalog, params), [catalog, params]);

  /**
   * The search box is the source of truth while the visitor types; the address
   * bar follows a moment later (so the page can be shared or reloaded). The box
   * takes the address-bar value back only when that changed from outside — the
   * back button or a link — never from its own write.
   */
  const addSearch = useSitePrefs((st) => st.addSearch);
  const [typed, setTyped] = useState(urlFilters.q);
  const written = useRef(urlFilters.q);
  useEffect(() => {
    if (urlFilters.q !== written.current) {
      written.current = urlFilters.q;
      setTyped(urlFilters.q);
    }
  }, [urlFilters.q]);
  useEffect(() => {
    if (typed === written.current) return;
    const timer = window.setTimeout(() => {
      written.current = typed;
      navigate(`${base}${filtersQuery({ ...urlFilters, q: typed, page: 1 })}`, { replace: true, state: KEEP_SCROLL });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [typed, urlFilters, base, navigate]);

  const filters: ListFilters = useMemo(
    () => (typed === urlFilters.q ? urlFilters : { ...urlFilters, q: typed, page: 1 }),
    [urlFilters, typed],
  );
  const view = useMemo(() => buildListView(catalog, filters), [catalog, filters]);
  const href = (patch: Partial<ListFilters>) => `${base}${filtersQuery({ ...filters, ...patch })}`;

  /** The header's search button lands here asking for the box. */
  const inputRef = useRef<HTMLInputElement>(null);
  const wantsSearch = Boolean((location.state as { focusSearch?: boolean } | null)?.focusSearch);
  useEffect(() => {
    if (!wantsSearch) return;
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ block: "center" });
  }, [wantsSearch, location.key]);

  /** After a filter change, bring the filters back into view if they scrolled away. */
  const topRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const filterKey = `${filters.brand}|${filters.cat}|${filters.sub}|${filters.sort}|${filters.price}|${filters.stock}`;
  const lastFilterKey = useRef("");
  useEffect(() => {
    const first = lastFilterKey.current === "";
    if (lastFilterKey.current === filterKey) return;
    lastFilterKey.current = filterKey;
    /** On phones each filter is one swipeable line: slide the chosen chip to its middle. */
    for (const chip of stackRef.current?.querySelectorAll<HTMLElement>('[role="group"] [aria-current="true"]') ?? []) {
      const row = chip.parentElement;
      if (!row || row.scrollWidth <= row.clientWidth) continue;
      const c = chip.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      row.scrollBy({ left: c.left + c.width / 2 - (r.left + r.width / 2) });
    }
    if (first) return;
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }, [filterKey]);

  const brandLabel = (b: string) => b || t("otherBrands");
  const count = (list: { brand: string }[], b: string) => list.filter((p) => p.brand === b).length;
  const all = catalog.products;

  const title =
    filters.brand !== "all"
      ? `${brandLabel(filters.brand)} — ${t("products")}`
      : view.cat !== "all"
        ? `${labelOf(catalog.catById.get(view.cat), locale)} — ${t("products")}`
        : t("seoProductsTitle");

  /** Sort, price and availability are controls, not links: they rewrite the address in place. */
  const apply = (patch: Partial<ListFilters>) =>
    navigate(href({ ...patch, page: 1 }), { replace: true, state: KEEP_SCROLL });
  const priceLabel = (r: (typeof PRICE_RANGES)[number]) =>
    r.min === 0
      ? t("priceUnder", { max: formatMoney(r.max ?? 0) })
      : r.max === null
        ? t("priceOver", { min: formatMoney(r.min) })
        : t("priceBetween", { min: formatMoney(r.min), max: formatMoney(r.max) });
  const narrowed =
    filters.brand !== "all" ||
    filters.cat !== "all" ||
    filters.sub !== "all" ||
    filters.sort !== "default" ||
    filters.price !== "all" ||
    filters.stock ||
    typed.trim() !== "";
  const clearAll = () => {
    written.current = "";
    setTyped("");
    navigate(base, { state: KEEP_SCROLL });
  };

  const shown = view.sectioned ? [] : view.list.slice((view.page - 1) * PAGE_SIZE, view.page * PAGE_SIZE);
  const sections = view.sectioned
    ? catalog.brands.flatMap((b) => {
        const mine = view.list.filter((p) => p.brand === b);
        return mine.length ? [{ brand: b, n: mine.length, items: mine.slice(0, SECTION_SIZE) }] : [];
      })
    : [];

  return (
    <section className={styles.page}>
      {/* One indexable address for the whole list: filtered views point back at it. */}
      <Seo title={title} description={t("seoProductsDesc")} canonicalPath={base} />
      <div ref={stackRef} className={`${styles.wrap} ${styles.pageStack}`}>
        <nav className={styles.crumbs} aria-label={t("breadcrumb")}>
          <RouterLink to={`/${locale}`}>{t("home")}</RouterLink>
          <span aria-hidden="true">/</span>
          <span className={styles.crumbNow} aria-current="page">
            {t("products")}
          </span>
        </nav>

        <div className={styles.listHead}>
          <div className={styles.listTitleBox}>
            <h1 className={styles.h1}>{t("products")}</h1>
            <span className={styles.count} aria-live="polite">
              {t("productCount", { count: view.list.length })}
            </span>
          </div>
          <label className={styles.searchBox}>
            <SearchIcon size={20} />
            <input
              ref={inputRef}
              type="search"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addSearch(typed);
              }}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchAria")}
              className={styles.searchInput}
              enterKeyHint="search"
              autoComplete="off"
            />
            {typed ? (
              <button
                type="button"
                className={styles.searchClear}
                aria-label={t("searchClear")}
                onClick={() => {
                  setTyped("");
                  inputRef.current?.focus();
                }}
              >
                <CloseIcon size={16} />
              </button>
            ) : null}
          </label>
        </div>

        <div ref={topRef} role="group" aria-label={t("filterBrand")} className={styles.chipRow}>
          <span className={styles.chipLabel}>{t("filterBrand")}</span>
          {["all", ...catalog.brands].map((b) => {
            const on = b === filters.brand;
            return (
              <RouterLink
                key={b || "other"}
                to={href({ brand: b, cat: "all", sub: "all", page: 1 })}
                state={KEEP_SCROLL}
                aria-current={on ? "true" : undefined}
                className={`${styles.chip} ${styles.chipBrand} ${on ? styles.chipBrandOn : ""}`}
              >
                <span>{b === "all" ? t("all") : brandLabel(b)}</span>
                <span className={styles.chipNum} dir="ltr">
                  {b === "all" ? all.length : count(all, b)}
                </span>
              </RouterLink>
            );
          })}
        </div>

        {view.ownCats.length > 1 ? (
          <div role="group" aria-label={t("filterCat")} className={styles.chipRow}>
            <span className={styles.chipLabel}>{t("filterCat")}</span>
            {[{ id: "all", ar: "", en: "" }, ...view.ownCats].map((c) => {
              const on = c.id === view.cat;
              return (
                <RouterLink
                  key={c.id}
                  to={href({ cat: c.id, sub: "all", page: 1 })}
                  state={KEEP_SCROLL}
                  aria-current={on ? "true" : undefined}
                  className={`${styles.chip} ${styles.chipCat} ${on ? styles.chipCatOn : ""}`}
                >
                  <span>{c.id === "all" ? t("all") : labelOf(c, locale)}</span>
                  <span className={styles.chipNum} dir="ltr">
                    {c.id === "all" ? view.inBrand.length : view.inBrand.filter((p) => p.cat === c.id).length}
                  </span>
                </RouterLink>
              );
            })}
          </div>
        ) : null}

        {view.cat !== "all" && view.ownSubs.length > 1 ? (
          <div role="group" aria-label={t("filterSub")} className={styles.chipRow}>
            <span className={styles.chipLabel}>{t("filterSub")}</span>
            {[{ id: "all", cat: view.cat, ar: "", en: "" }, ...view.ownSubs].map((s) => {
              const on = s.id === filters.sub;
              return (
                <RouterLink
                  key={s.id}
                  to={href({ cat: view.cat, sub: s.id, page: 1 })}
                  state={KEEP_SCROLL}
                  aria-current={on ? "true" : undefined}
                  className={`${styles.chip} ${styles.chipSub} ${on ? styles.chipSubOn : ""}`}
                >
                  <span>{s.id === "all" ? t("all") : labelOf(s, locale)}</span>
                  <span className={styles.chipNum} dir="ltr">
                    {s.id === "all" ? view.inCat.length : view.inCat.filter((p) => p.sub === s.id).length}
                  </span>
                </RouterLink>
              );
            })}
          </div>
        ) : null}

        <div role="group" aria-label={t("listTools")} className={styles.tools2}>
          <label className={styles.selectPill}>
            <span className={styles.selectLabel}>{t("sortLabel")}</span>
            <select
              className={styles.select}
              value={filters.sort}
              onChange={(e) => apply({ sort: e.target.value as SortKey })}
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(SORT_LABEL[k])}
                </option>
              ))}
            </select>
            <ChevronDownIcon />
          </label>
          <label className={styles.selectPill}>
            <span className={styles.selectLabel}>{t("priceLabel")}</span>
            <select className={styles.select} value={filters.price} onChange={(e) => apply({ price: e.target.value })}>
              <option value="all">{t("priceAll")}</option>
              {PRICE_RANGES.map((r) => (
                <option key={r.id} value={r.id}>
                  {priceLabel(r)}
                </option>
              ))}
            </select>
            <ChevronDownIcon />
          </label>
          <label className={`${styles.togglePill} ${filters.stock ? styles.togglePillOn : ""}`}>
            <input
              type="checkbox"
              className={styles.srOnly}
              checked={filters.stock}
              onChange={(e) => apply({ stock: e.target.checked })}
            />
            <span className={styles.toggleBox} aria-hidden="true">
              {filters.stock ? <CheckIcon size={14} /> : null}
            </span>
            <span>{t("stockOnly")}</span>
          </label>
          {narrowed ? (
            <button type="button" className={styles.clearBtn} onClick={clearAll}>
              <CloseIcon size={16} />
              <span>{t("clearFilters")}</span>
            </button>
          ) : null}
        </div>

        {view.sectioned && sections.length > 0 ? (
          <div className={styles.sections}>
            {sections.map((s) => (
              <section key={s.brand || "other"} className={styles.brandSection}>
                <div className={styles.brandHead}>
                  <h2 className={styles.h2}>
                    <span>{brandLabel(s.brand)}</span>
                    <span className={styles.h2Count}>{t("itemsCount", { count: s.n })}</span>
                  </h2>
                  <RouterLink
                    to={href({ brand: s.brand, page: 1 })}
                    className={styles.pillBtn}
                    aria-label={t("viewAllOf", { name: brandLabel(s.brand) })}
                  >
                    <span>{t("viewAll")}</span>
                    <ChevronIcon size={18} className={styles.flipLtr} />
                  </RouterLink>
                </div>
                <div className={styles.grid}>
                  {s.items.map((p) => (
                    <ProductCard key={p.id} product={p} catalog={catalog} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {!view.sectioned && shown.length > 0 ? (
          <div className={styles.grid}>
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} catalog={catalog} />
            ))}
          </div>
        ) : null}

        {view.list.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyTitle}>{t("emptyTitle")}</span>
            <span className={styles.emptyText}>{t("emptyText")}</span>
            <button type="button" className={styles.darkBtn} onClick={clearAll}>
              {t("showAll")}
            </button>
          </div>
        ) : null}

        {view.pages > 1 ? (
          <nav className={styles.pager} aria-label={t("pagesNav")}>
            <RouterLink
              to={href({ page: Math.max(1, view.page - 1) })}
              aria-label={t("prevPage")}
              aria-disabled={view.page <= 1}
              tabIndex={view.page <= 1 ? -1 : undefined}
              className={`${styles.pagerArrow} ${view.page <= 1 ? styles.pagerArrowOff : ""}`}
            >
              <ChevronIcon className={styles.flipRtl} />
            </RouterLink>
            {pageWindow(view.page, view.pages).map((n, i) =>
              n === 0 ? (
                <span key={`gap-${i}`} className={styles.pagerGap} aria-hidden="true">
                  …
                </span>
              ) : (
                <RouterLink
                  key={n}
                  to={href({ page: n })}
                  aria-label={t("pageN", { n })}
                  aria-current={n === view.page ? "page" : undefined}
                  className={`${styles.pagerNum} ${n === view.page ? styles.pagerNumOn : ""}`}
                >
                  <span dir="ltr">{n}</span>
                </RouterLink>
              ),
            )}
            <RouterLink
              to={href({ page: Math.min(view.pages, view.page + 1) })}
              aria-label={t("nextPage")}
              aria-disabled={view.page >= view.pages}
              tabIndex={view.page >= view.pages ? -1 : undefined}
              className={`${styles.pagerArrow} ${view.page >= view.pages ? styles.pagerArrowOff : ""}`}
            >
              <ChevronIcon className={styles.flipLtr} />
            </RouterLink>
          </nav>
        ) : null}
      </div>
    </section>
  );
}

export default function ProductsListPage() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const { data: catalog } = useCatalog();

  if (!catalog) {
    return (
      <section className={styles.page}>
        <Seo title={t("seoProductsTitle")} description={t("seoProductsDesc")} canonicalPath={`/${locale}/products`} />
        <div className={`${styles.wrap} ${styles.pageStack}`}>
          <h1 className={styles.h1}>{t("products")}</h1>
          <ListSkeleton />
        </div>
      </section>
    );
  }
  return <ProductList catalog={catalog} />;
}
