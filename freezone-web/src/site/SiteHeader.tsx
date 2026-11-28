import { useCallback, useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { persistPreferredLocale } from "@/lib/preferred-locale";
import { cartCount, useSiteCart } from "./cart";
import { filtersQuery, labelOf, useCatalog } from "./catalog";
import { CartIcon, ChevronDownIcon, HeartIcon, MenuIcon, SearchIcon } from "./icons";
import { useSitePrefs } from "./prefs";
import { useSiteUi } from "./ui";
import styles from "./site.module.css";

type MenuKey = "sections" | "brands";

/** Header links. Two of them open a panel (sections, brands); the others go to a page or a part of the home page. */
const NAV: readonly ({ key: string; path: string; hash?: string } | { key: string; menu: MenuKey })[] = [
  { key: "navProducts", path: "/products" },
  { key: "navSections", menu: "sections" },
  { key: "navBrands", menu: "brands" },
  { key: "navOffers", path: "", hash: "#offers" },
  { key: "navProjects", path: "", hash: "#solutions" },
];

/** The other language's address for the page being viewed. */
export function useOtherLocalePath(): { other: "ar" | "en"; path: string } {
  const locale = useLocale();
  const location = useLocation();
  const other = locale === "ar" ? "en" : "ar";
  return {
    other,
    path: location.pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${other}`) + location.search + location.hash,
  };
}

export function SiteHeader() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const location = useLocation();
  const { data: catalog } = useCatalog();
  const count = useSiteCart((s) => cartCount(s.items));
  const openCart = useSiteCart((s) => s.setOpen);
  const favCount = useSitePrefs((s) => s.favorites.length);
  const drawerOpen = useSiteUi((s) => s.menuOpen);
  const setDrawerOpen = useSiteUi((s) => s.setMenuOpen);
  const setSearchOpen = useSiteUi((s) => s.setSearchOpen);
  const { other, path: otherPath } = useOtherLocalePath();

  const [menu, setMenu] = useState<MenuKey | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const timer = useRef(0);
  const byKey = useRef(false);
  const headerRef = useRef<HTMLElement>(null);

  /** Hovering opens a panel after a beat and closes it a beat after leaving, so a diagonal move does not lose it. */
  const later = useCallback((next: MenuKey | null, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMenu(next), ms);
  }, []);
  const now = useCallback((next: MenuKey | null) => {
    window.clearTimeout(timer.current);
    setMenu(next);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** Any navigation closes the panel. */
  useEffect(() => {
    now(null);
  }, [location.pathname, location.search, location.hash, now]);

  useEffect(() => {
    if (!menu) return;
    if (byKey.current) {
      byKey.current = false;
      headerRef.current?.querySelector<HTMLElement>("#site-mega a")?.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      now(null);
      headerRef.current?.querySelector<HTMLElement>(`[data-menu="${menu}"]`)?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) now(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [menu, now]);

  /** A hairline under the bar becomes a soft shadow once the page has moved. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const list = `/${locale}/products`;
  const onProducts = location.pathname.startsWith(list) || location.pathname.startsWith(`/${locale}/product/`);

  return (
    <header
      ref={headerRef}
      className={`${styles.header} ${scrolled || menu ? styles.headerRaised : ""}`}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && menu) later(null, 220);
      }}
    >
      <div className={`${styles.wrap} ${styles.headerBar}`}>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.menuBtn}`}
          aria-label={t("menu")}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <MenuIcon />
        </button>
        <RouterLink to={`/${locale}`} className={styles.logoLink} aria-label={t("home")}>
          <img src="/site/logo.svg" alt="FreeZone" width={379} height={107} className={styles.logo} />
        </RouterLink>
        <nav className={styles.nav} aria-label={t("mainNav")}>
          {NAV.map((n) =>
            "menu" in n ? (
              <button
                key={n.key}
                type="button"
                data-menu={n.menu}
                className={`${styles.navLink} ${styles.navBtn} ${menu === n.menu ? styles.navLinkOn : ""}`}
                aria-expanded={menu === n.menu}
                aria-controls="site-mega"
                onClick={(e) => {
                  /* detail 0 = pressed with the keyboard: the panel's first link takes the focus. */
                  byKey.current = e.detail === 0;
                  now(menu === n.menu ? null : n.menu);
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") later(n.menu, menu ? 0 : 140);
                }}
              >
                <span>{t(n.key)}</span>
                <ChevronDownIcon className={`${styles.navCaret} ${menu === n.menu ? styles.navCaretOn : ""}`} />
              </button>
            ) : (
              <RouterLink
                key={n.key}
                to={{ pathname: `/${locale}${n.path}`, hash: n.hash }}
                className={`${styles.navLink} ${n.path === "/products" && onProducts ? styles.navLinkOn : ""}`}
                aria-current={n.path === "/products" && onProducts ? "page" : undefined}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse" && menu) later(null, 140);
                }}
              >
                {t(n.key)}
              </RouterLink>
            ),
          )}
        </nav>
        <div className={styles.tools}>
          <RouterLink
            to={otherPath}
            className={styles.langBtn}
            lang={other}
            aria-label={t("switchLangAria")}
            onClick={() => persistPreferredLocale(other)}
          >
            {t("switchLang")}
          </RouterLink>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={t("search")}
            aria-haspopup="dialog"
            onClick={() => {
              now(null);
              setSearchOpen(true);
            }}
          >
            <SearchIcon />
          </button>
          <RouterLink
            to={`/${locale}/wishlist`}
            className={`${styles.iconBtn} ${styles.favBtn}`}
            aria-label={favCount > 0 ? t("favoritesCount", { count: favCount }) : t("favorites")}
          >
            <HeartIcon size={22} />
            {favCount > 0 ? (
              <span className={`${styles.cartBadge} ${styles.badgeDark}`} dir="ltr">
                {favCount}
              </span>
            ) : null}
          </RouterLink>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={count > 0 ? t("cartCount", { count }) : t("cart")}
            aria-haspopup="dialog"
            onClick={() => openCart(true)}
          >
            <CartIcon />
            {count > 0 ? (
              /* Re-keyed on every change so the badge gives a small bump. */
              <span key={count} className={`${styles.cartBadge} ${styles.badgeBump}`} dir="ltr">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {menu && catalog ? (
        <div id="site-mega" className={styles.mega} onPointerEnter={() => window.clearTimeout(timer.current)}>
          <div className={`${styles.wrap} ${styles.megaInner}`}>
            {menu === "sections" ? (
              <>
                <div className={styles.megaCols}>
                  {catalog.cats.map((c) => {
                    const subs = catalog.subs.filter((s) => s.cat === c.id);
                    return (
                      <div key={c.id} className={styles.megaGroup}>
                        <RouterLink to={`${list}${filtersQuery({ cat: c.id })}`} className={styles.megaTitle}>
                          {labelOf(c, locale)}
                        </RouterLink>
                        {subs.length > 1
                          ? subs.map((s) => (
                              <RouterLink
                                key={s.id}
                                to={`${list}${filtersQuery({ cat: c.id, sub: s.id })}`}
                                className={styles.megaLink}
                              >
                                {labelOf(s, locale)}
                              </RouterLink>
                            ))
                          : null}
                      </div>
                    );
                  })}
                </div>
                <RouterLink to={list} className={styles.megaAll}>
                  {t("allProducts")}
                </RouterLink>
              </>
            ) : (
              <div className={styles.megaBrands}>
                {catalog.brands.map((b) => (
                  <RouterLink key={b || "other"} to={`${list}${filtersQuery({ brand: b })}`} className={styles.megaBrand}>
                    <span>{b || t("otherBrands")}</span>
                    <span className={styles.chipNum} dir="ltr">
                      {catalog.products.filter((p) => p.brand === b).length}
                    </span>
                  </RouterLink>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
