import { useEffect, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { persistPreferredLocale } from "@/lib/preferred-locale";
import { cartCount, useSiteCart } from "./cart";
import { CartIcon, CloseIcon, MenuIcon, SearchIcon } from "./icons";
import styles from "./site.module.css";

/** Header links: the product list, then four parts of the home page. */
const NAV: readonly { key: string; path: string; hash?: string }[] = [
  { key: "navProducts", path: "/products" },
  { key: "navSections", path: "", hash: "#categories" },
  { key: "navBrands", path: "", hash: "#brands" },
  { key: "navOffers", path: "", hash: "#offers" },
  { key: "navProjects", path: "", hash: "#solutions" },
];

export function SiteHeader() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const count = useSiteCart((s) => cartCount(s.items));
  const openCart = useSiteCart((s) => s.setOpen);

  /** Close the phone menu whenever the page changes. */
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  const other = locale === "ar" ? "en" : "ar";
  const otherPath = location.pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${other}`) + location.search + location.hash;

  const links = NAV.map((n) => (
    <RouterLink key={n.key} to={{ pathname: `/${locale}${n.path}`, hash: n.hash }} className={styles.navLink}>
      {t(n.key)}
    </RouterLink>
  ));

  return (
    <header className={styles.header}>
      <div className={`${styles.wrap} ${styles.headerBar}`}>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.menuBtn}`}
          aria-label={t(menuOpen ? "closeMenu" : "menu")}
          aria-expanded={menuOpen}
          aria-controls="site-mobile-nav"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <RouterLink to={`/${locale}`} className={styles.logoLink} aria-label={t("home")}>
          <img src="/site/logo.svg" alt="FreeZone" width={379} height={107} className={styles.logo} />
        </RouterLink>
        <nav className={styles.nav} aria-label={t("mainNav")}>
          {links}
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
          <RouterLink
            to={`/${locale}/products`}
            state={{ focusSearch: true }}
            className={styles.iconBtn}
            aria-label={t("search")}
          >
            <SearchIcon />
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
              <span className={styles.cartBadge} dir="ltr">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav id="site-mobile-nav" className={`${styles.wrap} ${styles.mobileNav}`} aria-label={t("mainNav")}>
          {NAV.map((n) => (
            <RouterLink key={n.key} to={{ pathname: `/${locale}${n.path}`, hash: n.hash }}>
              {t(n.key)}
            </RouterLink>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
