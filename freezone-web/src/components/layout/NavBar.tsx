"use client";

import { Link, usePathname, useRouter } from "@/navigation";
import { useNavigate } from "react-router-dom";
import { useTranslations, useLocale } from "@/i18n/hooks";
import { useCart } from "@/lib/store";
import { useStorefrontUser } from "@/lib/storefront-user";
import {
  ShoppingCart, Search, Menu, ChevronDown,
  Cpu, Laptop, Printer, Headphones,
  Package, UserRound, Globe2, ExternalLink, Star
} from "lucide-react";
import { LucideByName } from "@/lib/lucide-icon-map";
import styles from "./NavBar.module.css";
import { useState, useRef, useEffect, useLayoutEffect, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { MobileMenu } from "./MobileMenu";
import { SiteLogo } from "./SiteLogo";
import { TopBarSocialIcons } from "./TopBarSocialIcons";
import { useStorefront, usePublicSite } from "@/components/providers/StorefrontProvider";
import { storedNavToResolved } from "@/lib/nav-from-json";
import type { NavItemResolved } from "@/lib/nav-types";

export type { MegaMenuColumn, NavItemResolved } from "@/lib/nav-types";

// ─── Mega Menu Data (default when CMS `navItems` is empty) ─────────────────────────────────
const DEFAULT_NAV_ITEMS: NavItemResolved[] = [
  {
    id: "laptops",
    label: "Laptops & Computers",
    icon: Laptop,
    href: "/products?cat=laptops",
    columns: [
      {
        title: "Gaming Laptops",
        items: [
          { label: "All Gaming Laptops", href: "/products?cat=gaming" },
          { label: "ASUS ROG / TUF", href: "/products?brand=ASUS&cat=gaming" },
          { label: "MSI Gaming", href: "/products?brand=MSI&cat=gaming" },
          { label: "Lenovo Legion", href: "/products?brand=Lenovo&cat=gaming" },
          { label: "Acer Predator", href: "/products?brand=Acer&cat=gaming" },
          { label: "HP Omen", href: "/products?brand=HP&cat=gaming" },
          { label: "Dell Alienware", href: "/products?brand=Dell&cat=gaming" },
        ],
      },
      {
        title: "Laptops & Notebooks",
        items: [
          { label: "Business Laptops", href: "/products?cat=laptops&q=business" },
          { label: "Ultra-thin / Slim", href: "/products?cat=laptops&q=slim" },
          { label: "2-in-1 Convertibles", href: "/products?cat=laptops&q=2-in-1" },
          { label: "Apple MacBook", href: "/products?brand=Apple&cat=laptops&q=MacBook" },
          { label: "Microsoft Surface", href: "/products?brand=Microsoft&cat=laptops&q=Surface" },
        ],
      },
      {
        title: "Desktop & All-in-One",
        items: [
          { label: "All-in-One PCs", href: "/products?cat=all-in-one" },
          { label: "Desktop Systems", href: "/products?cat=computers&q=desktop" },
          { label: "Gaming Desktop Builds", href: "/pc-builder" },
          { label: "Workstations", href: "/products?cat=computers&q=workstation" },
          { label: "Mini PCs", href: "/products?cat=computers&q=mini" },
        ],
      },
      {
        title: "Featured Brands",
        highlight: true,
        items: [
          { label: "⭐ ASUS", href: "/products?brand=ASUS" },
          { label: "⭐ MSI", href: "/products?brand=MSI" },
          { label: "⭐ Lenovo", href: "/products?brand=Lenovo" },
          { label: "⭐ HP", href: "/products?brand=HP" },
          { label: "⭐ Dell", href: "/products?brand=Dell" },
          { label: "⭐ Acer", href: "/products?brand=Acer" },
          { label: "⭐ Apple", href: "/products?brand=Apple" },
        ],
      },
    ],
  },
  {
    id: "components",
    label: "PC Components",
    icon: Cpu,
    href: "/products?cat=components",
    columns: [
      {
        title: "Core Components",
        items: [
          { label: "Processors (CPU)", href: "/products?cat=components" },
          { label: "Motherboards", href: "/products?cat=components" },
          { label: "Graphics Cards (GPU)", href: "/products?cat=components" },
          { label: "RAM Memory (DDR5/DDR4)", href: "/products?cat=components" },
          { label: "SSD / NVMe Storage", href: "/products?cat=components" },
          { label: "Power Supplies (PSU)", href: "/products?cat=components" },
          { label: "PC Cases / Chassis", href: "/products?cat=components" },
        ],
      },
      {
        title: "Cooling & Upgrades",
        items: [
          { label: "Liquid Cooling (AIO)", href: "/products?cat=components" },
          { label: "Air CPU Coolers", href: "/products?cat=components" },
          { label: "Case Fans & RGB", href: "/products?cat=components" },
          { label: "Thermal Paste", href: "/products?cat=components" },
          { label: "Laptop Memory (SODIMM)", href: "/products?cat=components" },
          { label: "External Storage", href: "/products?cat=storage" },
        ],
      },
      {
        title: "Displays & Audio",
        items: [
          { label: "Gaming Monitors 144Hz+", href: "/products?cat=monitors" },
          { label: "IPS / Creative Monitors", href: "/products?cat=monitors" },
          { label: "Curved UltraWide", href: "/products?cat=monitors" },
          { label: "4K / OLED Monitors", href: "/products?cat=monitors" },
          { label: "Gaming Headsets", href: "/products?cat=accessories" },
          { label: "Speakers", href: "/products?cat=accessories" },
        ],
      },
      {
        title: "🔧 Build Your PC",
        highlight: true,
        cta: true,
        items: [
          { label: "🛠 PC Builder Wizard", href: "/pc-builder" },
          { label: "Gaming Builds", href: "/products?cat=components" },
          { label: "Workstation Builds", href: "/products?cat=components" },
          { label: "Budget Builds", href: "/products?cat=components" },
          { label: "High-End Builds", href: "/products?cat=components" },
        ],
      },
    ],
  },
  {
    id: "accessories",
    label: "Accessories",
    icon: Headphones,
    href: "/products?cat=accessories",
    columns: [
      {
        title: "Keyboards & Mice",
        items: [
          { label: "Mechanical Keyboards", href: "/products?cat=accessories" },
          { label: "Gaming Keyboards", href: "/products?cat=accessories" },
          { label: "Office Keyboards", href: "/products?cat=accessories" },
          { label: "Gaming Mice", href: "/products?cat=accessories" },
          { label: "Office Mice", href: "/products?cat=accessories" },
          { label: "Mouse Pads / Desk Mats", href: "/products?cat=accessories" },
        ],
      },
      {
        title: "Audio & Streaming",
        items: [
          { label: "Gaming Headsets", href: "/products?cat=accessories" },
          { label: "Studio Microphones", href: "/products?cat=accessories" },
          { label: "Webcams & Cameras", href: "/products?cat=accessories" },
          { label: "Stream Gear", href: "/products?cat=accessories" },
          { label: "Speakers", href: "/products?cat=accessories" },
          { label: "Earbuds / HiFi", href: "/products?cat=accessories" },
        ],
      },
      {
        title: "Tablets & Mobile",
        items: [
          { label: "All Tablets", href: "/products?cat=accessories" },
          { label: "Drawing Tablets", href: "/products?cat=accessories" },
          { label: "Smart Tablets", href: "/products?cat=accessories" },
          { label: "Stylus & Pens", href: "/products?cat=accessories" },
          { label: "Laptop Bags & Cases", href: "/products?cat=accessories" },
        ],
      },
      {
        title: "Cables & Controllers",
        items: [
          { label: "Gaming Controllers", href: "/products?cat=accessories" },
          { label: "Cables & Adapters", href: "/products?cat=accessories" },
          { label: "Gaming Chairs", href: "/products?cat=accessories" },
          { label: "USB Hubs & Docks", href: "/products?cat=accessories" },
          { label: "Software & OS", href: "/products?cat=accessories" },
          { label: "Tools & Maintenance", href: "/products?cat=accessories" },
        ],
      },
    ],
  },
  {
    id: "network",
    label: "Printers & Network",
    icon: Printer,
    href: "/products?cat=printers",
    columns: [
      {
        title: "Printers",
        items: [
          { label: "All Printers", href: "/products?cat=printers" },
          { label: "HP Printers", href: "/products?cat=printers&brand=HP" },
          { label: "Canon Printers", href: "/products?cat=printers&brand=Canon" },
          { label: "Epson Printers", href: "/products?cat=printers&brand=Epson" },
          { label: "Brother Printers", href: "/products?cat=printers&brand=Brother" },
          { label: "Laser Printers", href: "/products?cat=printers" },
          { label: "Scanners", href: "/products?cat=printers" },
        ],
      },
      {
        title: "Networking",
        items: [
          { label: "Routers & Access Points", href: "/products?cat=network" },
          { label: "Switches & Hubs", href: "/products?cat=network" },
          { label: "Network Cables (CAT6/7)", href: "/products?cat=network" },
          { label: "Modems", href: "/products?cat=network" },
          { label: "Network Adapters", href: "/products?cat=network" },
          { label: "UPS & Surge Protectors", href: "/products?cat=network" },
        ],
      },
      {
        title: "Security & Surveillance",
        items: [
          { label: "IP Cameras (CCTV)", href: "/products?cat=security" },
          { label: "DVR / NVR Systems", href: "/products?cat=security" },
          { label: "Door Access Control", href: "/products?cat=security" },
          { label: "Alarm Systems", href: "/products?cat=security" },
          { label: "Servers & NAS", href: "/products?cat=network" },
          { label: "Racks & Mounts", href: "/products?cat=network" },
        ],
      },
    ],
  },
  {
    id: "deals",
    label: "Deals & New",
    icon: Star,
    href: "/products",
    columns: [
      {
        title: "🔥 Hot Deals",
        items: [
          { label: "Today's Offers", href: "/products" },
          { label: "Clearance Sale", href: "/products" },
          { label: "Bundle Offers", href: "/products" },
          { label: "Open Box", href: "/products" },
        ],
      },
      {
        title: "🆕 New Arrivals",
        items: [
          { label: "Latest Laptops", href: "/products?isNew=true&cat=gaming" },
          { label: "New Components", href: "/products?isNew=true" },
          { label: "New Accessories", href: "/products?isNew=true&cat=accessories" },
        ],
      },
      {
        title: "⭐ Top Rated",
        items: [
          { label: "Best Sellers", href: "/products?featured=true" },
          { label: "Customer Favorites", href: "/products?featured=true" },
          { label: "Award Winners", href: "/products" },
        ],
      },
    ],
  },
];

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
    if (!q) {
      router.push("/products");
      return;
    }
    router.push(`/products?q=${encodeURIComponent(q)}`);
  };

  const toggleLanguage = () => {
    const nextLocale = locale === "ar" ? "en" : "ar";
    /** Full path including locale — must not use `useRouter().replace`, which prepends the *current* locale and would turn `/ar` into `/en/ar`. */
    const suffix = pathname === "/" ? "" : pathname;
    navigate(`/${nextLocale}${suffix}`, { replace: true });
  };

  const { items } = useCart();
  const isLoggedIn = useStorefrontUser((s) => s.isLoggedIn);
  const count = items.reduce((acc, obj) => acc + obj.qty, 0);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bottomNavHidden, setBottomNavHidden] = useState(false);
  /** Tier-1 bar: hidden at page top, shown after scrolling down, hidden again when back to top */
  const [topAnnouncementVisible, setTopAnnouncementVisible] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const reduceMotion = useReducedMotion();

  const TOP_BAR_SCROLL_PX = 12;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setTopAnnouncementVisible(y > TOP_BAR_SCROLL_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onScroll = () => {
      if (!mq.matches) {
        setBottomNavHidden(false);
        return;
      }
      const y = window.scrollY;
      const prev = lastScrollY.current;
      if (y < 36) {
        setBottomNavHidden(false);
      } else if (y > prev && y > 64) {
        setBottomNavHidden(true);
        setActiveMenu(null);
      } else if (y < prev) {
        setBottomNavHidden(false);
      }
      lastScrollY.current = y;
    };
    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    const onMq = () => {
      if (!mq.matches) setBottomNavHidden(false);
    };
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveMenu(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!activeMenu) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const el = navRef.current;
      if (el && !el.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [activeMenu]);

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
      className={`${styles.wrapper} ${bottomNavHidden ? styles.wrapperBottomNavHidden : ""}`}
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

          {/* Central Search Bar */}
          <div className={styles.searchBarWrapper}>
            <form className={styles.searchBar} onSubmit={submitHeaderSearch} role="search">
              <label className={styles.searchBarLeft}>
                <span className={styles.visuallyHidden}>{t("search")}</span>
                <Search className={styles.searchBarIcon} size={22} strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder={t("search")}
                  value={headerSearchQuery}
                  onChange={(e) => setHeaderSearchQuery(e.target.value)}
                  autoComplete="off"
                  enterKeyHint="search"
                />
              </label>
              <button type="submit" className={styles.searchBtnInside}>
                <Search size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "7px" }} aria-hidden />
                {t("searchBtn")}
              </button>
            </form>
          </div>

          {/* Actions */}
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

            <button
              type="button"
              className={styles.actionIcon}
              onClick={toggleLanguage}
              title={t("languageToggle")}
              aria-label={t("languageToggle")}
            >
              <Globe2 size={22} strokeWidth={1.75} aria-hidden />
              <span className={styles.actionLabel}>{locale === "ar" ? "عربي" : "EN"}</span>
            </button>

            <Link href="/cart" className={styles.actionIcon} title={t('cart')}>
              <ShoppingCart size={22} />
              <span className={styles.actionLabel}>{t('cart')}</span>
              {count > 0 && <span className={styles.cartBadge}>{count}</span>}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tier 3: Bottom Categories Nav (centered; hides on scroll down @ lg+) ── */}
      <nav className={`${styles.bottomNav} ${bottomNavHidden ? styles.bottomNavHidden : ""}`} aria-hidden={bottomNavHidden}>
        <div className={`container ${styles.bottomInner}`}>
          <div className={styles.links}>
            <div className={styles.linkItem}>
              <Link href="/" className={styles.link}>{t('home')}</Link>
            </div>

            {navItems.map((item) => (
              <div key={item.id} className={styles.linkItem}>
                <Link
                  href={item.href}
                  className={`${styles.link} ${activeMenu === item.id ? styles.linkActive : ""}`}
                  aria-expanded={activeMenu === item.id}
                  aria-haspopup="true"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveMenu((m) => (m === item.id ? null : item.id));
                  }}
                >
                  {item.label}
                  <ChevronDown
                    size={14}
                    className={`${styles.chevron} ${activeMenu === item.id ? styles.chevronOpen : ""}`}
                  />
                </Link>

                <AnimatePresence>
                  {activeMenu === item.id && (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className={styles.megaMenuWrapper}
                    >
                      <div className={styles.megaInner}>
                        <div
                          className={styles.megaGrid}
                          style={{ gridTemplateColumns: `repeat(${item.columns.length}, 1fr)` }}
                        >
                          {item.columns.map((col, ci) => (
                            <div key={ci} className={`${styles.megaCol} ${col.cta ? styles.megaColCta : ""}`}>
                              <h4 className={`${styles.megaColTitle} ${col.highlight ? styles.megaColTitleHighlight : ""}`}>
                                {col.title}
                              </h4>
                              <div className={styles.megaList}>
                                {col.items.map((link, li) => (
                                  <Link
                                    key={li}
                                    href={link.href}
                                    className={`${styles.megaItem} ${col.cta && li === 0 ? styles.megaItemCta : ""}`}
                                    onClick={() => setActiveMenu(null)}
                                  >
                                    {link.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Bottom promo row */}
                        <div className={styles.megaFooter}>
                          <div className={styles.megaFooterLeft}>
                            <Package size={16} />
                            <span>Free delivery on orders over 100,000 IQD across safe zones.</span>
                          </div>
                          <Link href="/products" className={styles.megaFooterLink}>
                            View All Products <ExternalLink size={14} />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}


          </div>
        </div>
      </nav>

      {/* ── Overlay ── */}
      <AnimatePresence>
        {activeMenu && (
          <motion.div
            className={styles.menuOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </motion.div>
  );
}
