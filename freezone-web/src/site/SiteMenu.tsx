import { useCallback, useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { persistPreferredLocale } from "@/lib/preferred-locale";
import { filtersQuery, labelOf, useCatalog } from "./catalog";
import { WHATSAPP_DISPLAY, whatsappLink } from "./contact";
import { ChevronDownIcon, CloseIcon, HeartIcon, WhatsAppIcon } from "./icons";
import { useOverlay } from "./overlay";
import { useSitePrefs } from "./prefs";
import { useOtherLocalePath } from "./SiteHeader";
import { useSiteUi } from "./ui";
import styles from "./site.module.css";

/**
 * The phone menu: a panel that slides in from the side with every destination
 * of the site — sections (each opening to its types), brands, the home page
 * parts, favourites, contact and the language switch.
 */
export function SiteMenu() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const location = useLocation();
  const open = useSiteUi((s) => s.menuOpen);
  const setOpen = useSiteUi((s) => s.setMenuOpen);
  const favCount = useSitePrefs((s) => s.favorites.length);
  const { data: catalog } = useCatalog();
  const { other, path: otherPath } = useOtherLocalePath();
  const [group, setGroup] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useOverlay(open, close, closeRef);

  /** Going anywhere closes the menu. */
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search, location.hash, setOpen]);

  if (!open) return null;

  const list = `/${locale}/products`;
  const home = `/${locale}`;
  const toggle = (id: string) => setGroup((g) => (g === id ? null : id));

  return (
    <div className={`${styles.cartLayer} ${styles.menuLayer}`}>
      <button type="button" className={styles.cartScrim} aria-label={t("closeMenu")} tabIndex={-1} onClick={close} />
      <div className={`${styles.cartPanel} ${styles.menuPanel}`} role="dialog" aria-modal="true" aria-label={t("menu")}>
        <div className={styles.cartHead}>
          <img src="/site/logo.svg" alt="FreeZone" width={379} height={107} className={styles.menuLogo} />
          <button ref={closeRef} type="button" className={styles.iconBtn} aria-label={t("closeMenu")} onClick={close}>
            <CloseIcon />
          </button>
        </div>
        <nav className={styles.menuList} aria-label={t("mainNav")}>
          <RouterLink to={home} className={styles.menuItem}>
            {t("home")}
          </RouterLink>
          <RouterLink to={list} className={styles.menuItem}>
            {t("allProducts")}
          </RouterLink>

          <button type="button" className={styles.menuItem} aria-expanded={group === "sections"} onClick={() => toggle("sections")}>
            <span>{t("navSections")}</span>
            <ChevronDownIcon className={`${styles.navCaret} ${group === "sections" ? styles.navCaretOn : ""}`} />
          </button>
          {group === "sections" && catalog ? (
            <div className={styles.menuSub}>
              {catalog.cats.map((c) => (
                <RouterLink key={c.id} to={`${list}${filtersQuery({ cat: c.id })}`} className={styles.menuSubItem}>
                  <span>{labelOf(c, locale)}</span>
                  <span className={styles.chipNum} dir="ltr">
                    {catalog.products.filter((p) => p.cat === c.id).length}
                  </span>
                </RouterLink>
              ))}
            </div>
          ) : null}

          <button type="button" className={styles.menuItem} aria-expanded={group === "brands"} onClick={() => toggle("brands")}>
            <span>{t("navBrands")}</span>
            <ChevronDownIcon className={`${styles.navCaret} ${group === "brands" ? styles.navCaretOn : ""}`} />
          </button>
          {group === "brands" && catalog ? (
            <div className={styles.menuSub}>
              {catalog.brands.map((b) => (
                <RouterLink key={b || "other"} to={`${list}${filtersQuery({ brand: b })}`} className={styles.menuSubItem}>
                  <span>{b || t("otherBrands")}</span>
                  <span className={styles.chipNum} dir="ltr">
                    {catalog.products.filter((p) => p.brand === b).length}
                  </span>
                </RouterLink>
              ))}
            </div>
          ) : null}

          <RouterLink to={{ pathname: home, hash: "#offers" }} className={styles.menuItem}>
            {t("navOffers")}
          </RouterLink>
          <RouterLink to={{ pathname: home, hash: "#solutions" }} className={styles.menuItem}>
            {t("navProjects")}
          </RouterLink>
          <RouterLink to={`/${locale}/wishlist`} className={styles.menuItem}>
            <span className={styles.menuWithIcon}>
              <HeartIcon size={20} />
              {t("favorites")}
            </span>
            {favCount > 0 ? (
              <span className={styles.chipNum} dir="ltr">
                {favCount}
              </span>
            ) : null}
          </RouterLink>
          <RouterLink to={`/${locale}/contact`} className={styles.menuItem}>
            {t("navContact")}
          </RouterLink>
        </nav>
        <div className={styles.menuFoot}>
          <a className={styles.menuWa} href={whatsappLink(t("waHello"))} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={20} />
            <span>
              {t("whatsapp")} <bdi dir="ltr">{WHATSAPP_DISPLAY}</bdi>
            </span>
          </a>
          <RouterLink
            to={otherPath}
            className={styles.pillBtn}
            lang={other}
            aria-label={t("switchLangAria")}
            onClick={() => persistPreferredLocale(other)}
          >
            {t("switchLangAria")}
          </RouterLink>
        </div>
      </div>
    </div>
  );
}
