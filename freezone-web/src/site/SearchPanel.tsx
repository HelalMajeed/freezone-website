import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import {
  filtersQuery,
  formatMoney,
  labelOf,
  plainText,
  productImage,
  productKind,
  searchCatalog,
  useCatalog,
} from "./catalog";
import { CloseIcon, SearchIcon } from "./icons";
import { useOverlay } from "./overlay";
import { useSitePrefs } from "./prefs";
import { useSiteUi } from "./ui";
import styles from "./site.module.css";

/**
 * Search from anywhere on the site: a panel under the header that lists matching
 * products, sections and brands while the visitor types. Enter (or "show all")
 * opens the product list with the same words. Arrow keys move a highlight
 * through the product results and Enter opens the highlighted one.
 */
export function SearchPanel() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const open = useSiteUi((s) => s.searchOpen);
  const setOpen = useSiteUi((s) => s.setSearchOpen);
  const searches = useSitePrefs((s) => s.searches);
  const addSearch = useSitePrefs((s) => s.addSearch);
  const removeSearch = useSitePrefs((s) => s.removeSearch);
  const { data: catalog } = useCatalog();
  const [q, setQ] = useState("");
  /** Index of the product result the arrow keys are on (-1 = the text box). */
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useOverlay(open, close, inputRef);

  /** Start clean each time, and close when the page changes underneath. */
  useEffect(() => {
    if (open) {
      setQ("");
      setActive(-1);
    }
  }, [open]);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search, setOpen]);

  /** "/" opens search from anywhere, unless the visitor is typing in a field. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const hits = useMemo(() => (catalog && q.trim() ? searchCatalog(catalog, q, 6) : null), [catalog, q]);

  if (!open) return null;

  const list = `/${locale}/products`;
  const typed = q.trim();
  /** Closing here as well covers a link to the address already open (no page change to react to). */
  const goAll = (text: string) => {
    addSearch(text);
    close();
    navigate(`${list}${filtersQuery({ q: text })}`);
  };
  const remember = () => {
    addSearch(typed);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = hits?.products.length ?? 0;
    if (e.key === "ArrowDown" && n > 0) {
      e.preventDefault();
      setActive((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp" && n > 0) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? n - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!typed) return;
      const p = active >= 0 ? hits?.products[active] : undefined;
      if (p) {
        remember();
        navigate(`/${locale}/product/${p.id}`);
      } else goAll(typed);
    }
  };

  return (
    <div className={styles.searchLayer}>
      <button type="button" className={styles.cartScrim} aria-label={t("searchClose")} tabIndex={-1} onClick={close} />
      <div className={styles.searchPanel} role="dialog" aria-modal="true" aria-label={t("searchAria")}>
        <div className={styles.searchTop}>
          <label className={`${styles.searchBox} ${styles.searchBoxWide}`}>
            <SearchIcon size={20} />
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder={t("searchHint")}
              aria-label={t("searchAria")}
              className={styles.searchInput}
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <button type="button" className={styles.iconBtn} aria-label={t("searchClose")} onClick={close}>
            <CloseIcon />
          </button>
        </div>

        <span className={styles.srOnly} role="status">
          {typed && hits ? t("productCount", { count: hits.total }) : ""}
        </span>
        <div className={styles.searchBody}>
          {!typed ? (
            <>
              {searches.length > 0 ? (
                <div className={styles.searchGroup}>
                  <span className={styles.searchLabel}>{t("searchRecent")}</span>
                  <div className={styles.searchChips}>
                    {searches.map((s) => (
                      <span key={s} className={styles.recentChip}>
                        <button type="button" className={styles.recentText} onClick={() => goAll(s)}>
                          {s}
                        </button>
                        <button
                          type="button"
                          className={styles.recentRemove}
                          aria-label={t("searchRemove", { q: s })}
                          onClick={() => removeSearch(s)}
                        >
                          <CloseIcon size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {catalog ? (
                <div className={styles.searchGroup}>
                  <span className={styles.searchLabel}>{t("searchBrowse")}</span>
                  <div className={styles.searchChips}>
                    {catalog.cats.map((c) => (
                      <RouterLink
                        key={c.id}
                        to={`${list}${filtersQuery({ cat: c.id })}`}
                        className={`${styles.chip} ${styles.chipCat}`}
                        onClick={close}
                      >
                        {labelOf(c, locale)}
                      </RouterLink>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : !hits ? (
            <span className={styles.searchLabel}>{t("loading")}</span>
          ) : hits.total === 0 && hits.cats.length + hits.subs.length + hits.brands.length === 0 ? (
            <div className={styles.searchNone}>
              <span className={styles.emptyTitle}>{t("searchNone", { q: typed })}</span>
              <span className={styles.emptyText}>{t("searchNoneHint")}</span>
            </div>
          ) : (
            <>
              {hits.cats.length + hits.subs.length + hits.brands.length > 0 ? (
                <div className={styles.searchChips}>
                  {hits.brands.map((b) => (
                    <RouterLink
                      key={`b-${b}`}
                      to={`${list}${filtersQuery({ brand: b })}`}
                      className={`${styles.chip} ${styles.chipBrand}`}
                      onClick={remember}
                    >
                      {b}
                    </RouterLink>
                  ))}
                  {hits.cats.map((c) => (
                    <RouterLink
                      key={`c-${c.id}`}
                      to={`${list}${filtersQuery({ cat: c.id })}`}
                      className={`${styles.chip} ${styles.chipCat}`}
                      onClick={remember}
                    >
                      {labelOf(c, locale)}
                    </RouterLink>
                  ))}
                  {hits.subs.map((s) => (
                    <RouterLink
                      key={`s-${s.id}`}
                      to={`${list}${filtersQuery({ cat: s.cat, sub: s.id })}`}
                      className={`${styles.chip} ${styles.chipSub}`}
                      onClick={remember}
                    >
                      {labelOf(s, locale)}
                    </RouterLink>
                  ))}
                </div>
              ) : null}
              {hits.products.length > 0 ? (
                <ul className={styles.hitList} aria-label={t("products")}>
                  {hits.products.map((p, i) => (
                    <li key={p.id}>
                      <RouterLink
                        to={`/${locale}/product/${p.id}`}
                        className={`${styles.hit} ${i === active ? styles.hitOn : ""}`}
                        onClick={remember}
                        onPointerEnter={() => setActive(i)}
                      >
                        <span className={styles.hitThumb}>
                          <img src={productImage(p.id, "small")} alt="" width={320} height={320} loading="lazy" decoding="async" />
                        </span>
                        <span className={styles.hitText}>
                          <span className={styles.hitName}>{plainText(productKind(p, locale))}</span>
                          <span className={styles.hitMeta} dir="ltr">
                            {[p.brand, p.model].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className={styles.hitPrice}>
                          <span dir="ltr">{formatMoney(p.price)}</span>
                          <span className={styles.cartCur}>{t("currency")}</span>
                        </span>
                      </RouterLink>
                    </li>
                  ))}
                </ul>
              ) : null}
              {hits.total > 0 ? (
                <button type="button" className={styles.searchAll} onClick={() => goAll(typed)}>
                  {t("searchSeeAll", { count: hits.total })}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
