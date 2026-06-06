"use client";

import { Link, usePathname, useRouter } from "@/navigation";
import { useNavigate } from "react-router-dom";
import { useTranslations, useLocale } from "@/i18n/hooks";
import { useCart } from "@/lib/store";
import { useStorefrontUser } from "@/lib/storefront-user";
import {
  ShoppingCart,
  Search,
  Menu,
  UserRound,
  Heart,
} from "lucide-react";
import { BrandMarkIcon } from "./BrandMarkIcon";
import { LucideByName } from "@/lib/lucide-icon-map";
import styles from "./NavBar.module.css";
import { useState, useRef, useEffect, useLayoutEffect, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { MobileMenu } from "./MobileMenu";
import { SiteLogo } from "./SiteLogo";
import { TopBarSocialIcons } from "./TopBarSocialIcons";
import { useStorefront, usePublicSite } from "@/components/providers/StorefrontProvider";
import { storedNavToResolved } from "@/lib/nav-from-json";
import { DEFAULT_NAV_ITEMS } from "@/lib/default-mega-nav";
import { useWishlist } from "@/lib/wishlist-store";
import {
  fetchSearchSuggestions,
  filterSuggestions,
  hasRemoteSuggestions,
  pushRecentSearch,
  readRecentSearches,
  TRENDING_SEARCHES,
} from "@/lib/search-suggestions";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

export type { MegaMenuColumn, NavItemResolved } from "@/lib/nav-types";

// ─── Component ──────────────────────────────────────
export function NavBar() {
  const t = useTranslations("Navigation");
  const locale = useLocale() as "en" | "ar";
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = usePathname();
  const { home } = useStorefront();
  const siteTop = usePublicSite();
  const navItems =
    home.navItems && home.navItems.length > 0
      ? storedNavToResolved(home.navItems, locale)
      : DEFAULT_NAV_ITEMS;

  const submitHeaderSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = headerSearchQuery.trim();
    setSearchOpen(false);
    if (!q) {
      router.push("/products");
      return;
    }
    pushRecentSearch(q);
    router.push(`/products?q=${encodeURIComponent(q)}`);
  };

  const applySuggestion = (q: string) => {
    setHeaderSearchQuery(q);
    pushRecentSearch(q);
    setSearchOpen(false);
    router.push(`/products?q=${encodeURIComponent(q.trim())}`);
  };

  const toggleLanguage = () => {
    const nextLocale = locale === "ar" ? "en" : "ar";
    /** Full path including locale — must not use `useRouter().replace`, which prepends the *current* locale and would turn `/ar` into `/en/ar`. */
    const suffix = pathname === "/" ? "" : pathname;
    navigate(`/${nextLocale}${suffix}`, { replace: true });
  };

  const { items } = useCart();
  const wishlistIds = useWishlist((s) => s.ids);
  const wishCount = wishlistIds.length;
  const isLoggedIn = useStorefrontUser((s) => s.isLoggedIn);
  const count = items.reduce((acc, obj) => acc + obj.qty, 0);
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  /** Live suggestions from the API contract, debounced; local trending/recent
   *  lists remain the graceful fallback until the endpoint is deployed. */
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(headerSearchQuery), 250);
    return () => window.clearTimeout(id);
  }, [headerSearchQuery]);
  const suggestQ = debouncedQuery.trim();
  const { data: remoteSuggestions } = useQuery({
    queryKey: ["search-suggestions", suggestQ],
    queryFn: () => fetchSearchSuggestions(suggestQ),
    enabled: searchOpen && suggestQ.length >= 2,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
  const remote =
    suggestQ.length >= 2 && hasRemoteSuggestions(remoteSuggestions) ? remoteSuggestions : null;
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  /** Tier-1 bar: visible at page top, collapses when user scrolls down, returns when back to top */
  const [topAnnouncementVisible, setTopAnnouncementVisible] = useState(true);
  const navRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const TOP_BAR_SCROLL_PX = 12;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setTopAnnouncementVisible(y <= TOP_BAR_SCROLL_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const openMenu = () => setIsMobileMenuOpen(true);
    window.addEventListener("fz:open-mobile-menu", openMenu as EventListener);
    return () => window.removeEventListener("fz:open-mobile-menu", openMenu as EventListener);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = searchWrapRef.current;
      if (el && !el.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [searchOpen]);

  /** Publish header height so sticky sidebars (e.g. products filter) sit below the bar, not under it (z-index). */
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--fz-storefront-sticky-offset", `${h}px`);
    };

    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    window.addEventListener("resize", publish);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", publish);
      document.documentElement.style.removeProperty("--fz-storefront-sticky-offset");
    };
  }, []);

  return (
    <motion.div
      className={styles.wrapper}
      ref={navRef}
      initial={reduceMotion ? false : { opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE_OUT }}
    >
      {/* ── Tier 1: Top Bar (CMS: ألوان، نصوص، أيقونات، روابط) ── */}
      <div
        className={`${styles.topBar} ${!topAnnouncementVisible ? styles.topBarCollapsed : ""}`}
        style={{ background: siteTop.topBarBgColor }}
        aria-hidden={!topAnnouncementVisible}
      >
        <div className={`container ${styles.topBarInner}`}>
          <div className={styles.topContact}>
            <a
              href={
                siteTop.topBarPhoneHref?.trim() ||
                `tel:${siteTop.phone.replace(/\s/g, "")}`
              }
              className={styles.contactItem}
              style={{ color: siteTop.topBarContactColor }}
              title="Call Us"
            >
              <LucideByName name={siteTop.topBarPhoneIconKey} size={12} style={{ color: "currentColor" }} aria-hidden />
              {siteTop.topBarPhoneLabel}
            </a>
            <a
              href={
                siteTop.topBarWhatsappHref?.trim() ||
                `https://wa.me/${(siteTop.whatsapp || siteTop.phone || "+9640000000000").replace(/\D/g, "")}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactItem}
              style={{ color: siteTop.topBarContactColor }}
              title="WhatsApp"
            >
              <LucideByName name={siteTop.topBarWhatsappIconKey} size={12} style={{ color: "currentColor" }} aria-hidden />
              {siteTop.topBarWhatsappLabel}
            </a>
          </div>
          {(() => {
            const promoText =
              siteTop.promoBarEnabled && siteTop.promoBarText?.trim()
                ? siteTop.promoBarText
                : t("promo");
            const href = siteTop.topBarPromoHref?.trim();
            const inner = (
              <>
                <LucideByName
                  name={siteTop.topBarPromoIconKey}
                  size={14}
                  style={{ color: "currentColor", flexShrink: 0 }}
                  aria-hidden
                />
                <span>{promoText}</span>
              </>
            );
            const promoStyle = { color: siteTop.topBarPromoColor } as const;
            if (href) {
              if (/^https?:\/\//i.test(href)) {
                return (
                  <a
                    href={href}
                    className={styles.topPromo}
                    style={promoStyle}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {inner}
                  </a>
                );
              }
              return (
                <Link href={href} className={styles.topPromo} style={promoStyle}>
                  {inner}
                </Link>
              );
            }
            return (
              <div className={styles.topPromo} style={promoStyle}>
                {inner}
              </div>
            );
          })()}
          <TopBarSocialIcons
            links={siteTop.social}
            enabled={siteTop.topBarSocialEnabled}
            iconSizePx={siteTop.topBarSocialIconSizePx}
            gapPx={siteTop.topBarSocialGapPx}
            color={siteTop.topBarSocialColor}
          />
        </div>
      </div>

      {/* ── Tier 2: Middle Action Bar ── */}
      <div className={styles.middleBar}>
        <div className={`container ${styles.middleInner}`}>
          <div className={styles.brandSlot}>
            <SiteLogo variant="navbar" />
          </div>

          {/* Central Search Bar + suggestions (desktop / tablet) */}
          <div className={styles.searchBarWrapper} ref={searchWrapRef}>
            <form className={styles.searchBar} onSubmit={submitHeaderSearch} role="search">
              <label className={styles.searchBarLeft}>
                <span className={styles.visuallyHidden}>{t("search")}</span>
                <Search className={styles.searchBarIcon} size={22} strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder={t("search")}
                  value={headerSearchQuery}
                  onChange={(e) => {
                    setHeaderSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => {
                    setRecentSearches(readRecentSearches());
                    setSearchOpen(true);
                  }}
                  autoComplete="off"
                  enterKeyHint="search"
                  aria-expanded={searchOpen}
                  aria-controls="fz-header-search-panel"
                  aria-autocomplete="list"
                />
              </label>
              <button type="submit" className={styles.searchBtnInside}>
                <Search size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "7px" }} aria-hidden />
                {t("searchBtn")}
              </button>
            </form>
            {searchOpen ? (
              <div id="fz-header-search-panel" className={styles.searchPanel} role="listbox" aria-label={t("search")}>
                {remote ? (
                  <>
                    {remote.products.length > 0 ? (
                      <div className={styles.searchPanelSection}>
                        <div className={styles.searchPanelTitle}>{t("productsGroup")}</div>
                        {remote.products.map((p) => {
                          const name = locale === "ar" ? p.nameAr || p.nameEn : p.nameEn || p.nameAr;
                          const price = p.salePrice ?? p.price;
                          const oldPrice = p.salePrice != null && p.salePrice < p.price ? p.price : null;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className={styles.suggestProduct}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                pushRecentSearch(suggestQ);
                                setSearchOpen(false);
                                router.push(`/product/${p.id}`);
                              }}
                            >
                              {p.image ? (
                                <ResponsiveImage
                                  src={p.image}
                                  alt=""
                                  className={styles.suggestThumb}
                                  sizes="40px"
                                  aspectRatio={1}
                                />
                              ) : (
                                <span className={styles.suggestThumbFallback} aria-hidden />
                              )}
                              <span className={styles.suggestBody}>
                                <span className={styles.suggestName}>{name}</span>
                                <span className={styles.suggestPrice}>
                                  {formatMoney(price)} IQD
                                  {oldPrice != null ? (
                                    <span className={styles.suggestOldPrice}>{formatMoney(oldPrice)}</span>
                                  ) : null}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    {remote.categories.length > 0 ? (
                      <div className={styles.searchPanelSection}>
                        <div className={styles.searchPanelTitle}>{t("categoriesGroup")}</div>
                        {remote.categories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={styles.searchSuggestion}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSearchOpen(false);
                              router.push(`/category/${encodeURIComponent(c.slug)}`);
                            }}
                          >
                            {locale === "ar" ? c.nameAr || c.nameEn : c.nameEn || c.nameAr}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {remote.brands.length > 0 ? (
                      <div className={styles.searchPanelSection}>
                        <div className={styles.searchPanelTitle}>{t("brandsGroup")}</div>
                        {remote.brands.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            className={styles.searchSuggestion}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSearchOpen(false);
                              router.push(`/brand/${encodeURIComponent(b.slug)}`);
                            }}
                          >
                            {locale === "ar" ? b.nameAr || b.nameEn : b.nameEn || b.nameAr}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {remote.queries.length > 0 ? (
                      <div className={styles.searchPanelSection}>
                        <div className={styles.searchPanelTitle}>{t("suggestions")}</div>
                        {remote.queries.map((q) => (
                          <button
                            key={q}
                            type="button"
                            className={styles.searchSuggestion}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applySuggestion(q)}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className={styles.seeAllBtn}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestion(suggestQ)}
                    >
                      {t("seeAllResults", { q: suggestQ })}
                    </button>
                  </>
                ) : (
                  <>
                    <div className={styles.searchPanelSection}>
                      <div className={styles.searchPanelTitle}>{t("trending")}</div>
                      {TRENDING_SEARCHES.slice(0, 6).map((row) => (
                        <button
                          key={row.q}
                          type="button"
                          className={styles.searchSuggestion}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applySuggestion(row.q)}
                        >
                          {row.label}
                        </button>
                      ))}
                    </div>
                    {recentSearches.length > 0 ? (
                      <div className={styles.searchPanelSection}>
                        <div className={styles.searchPanelTitle}>{t("recentSearches")}</div>
                        {recentSearches.map((q) => (
                          <button
                            key={q}
                            type="button"
                            className={styles.searchSuggestion}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applySuggestion(q)}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className={styles.searchPanelSection}>
                      <div className={styles.searchPanelTitle}>{t("suggestions")}</div>
                      {filterSuggestions(headerSearchQuery).map((row) => (
                        <button
                          key={`${row.q}-${row.label}`}
                          type="button"
                          className={styles.searchSuggestion}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applySuggestion(row.q)}
                        >
                          {row.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {/* Actions: LOGO left already | SEARCH center | actions right */}
          <div className={styles.actions}>
            <button className={`${styles.actionIcon} ${styles.menuToggle}`} onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>

            <Link
              href={isLoggedIn ? "/account" : "/login"}
              className={styles.actionIcon}
              title={isLoggedIn ? t("myAccount") : t("signIn")}
            >
              <UserRound size={22} strokeWidth={1.75} aria-hidden />
              <span className={styles.actionLabel}>{isLoggedIn ? t("myAccount") : t("signIn")}</span>
            </Link>

            <Link href="/wishlist" className={styles.actionIcon} title={t("wishlist")} aria-label={t("wishlist")}>
              <Heart
                size={22}
                strokeWidth={1.75}
                aria-hidden
                fill={wishCount > 0 ? "currentColor" : "none"}
              />
              <span className={styles.actionLabel}>{t("wishlist")}</span>
              {wishCount > 0 ? <span className={styles.cartBadge}>{wishCount}</span> : null}
            </Link>

            <button
              type="button"
              className={`${styles.actionIcon} ${styles.langDesktopOnly}`}
              onClick={toggleLanguage}
              title={t("languageToggle")}
              aria-label={t("languageToggle")}
            >
              <BrandMarkIcon size={22} />
              <span className={styles.actionLabel}>{locale === "ar" ? "عربي" : "EN"}</span>
            </button>

            <Link href="/cart" className={styles.actionIcon} title={t("cart")}>
              <ShoppingCart size={22} />
              <span className={styles.actionLabel}>{t("cart")}</span>
              {count > 0 ? <span className={styles.cartBadge}>{count}</span> : null}
            </Link>
          </div>
        </div>
      </div>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        megaNavItems={navItems}
        onToggleLocale={toggleLanguage}
        locale={locale}
      />
    </motion.div>
  );
}
