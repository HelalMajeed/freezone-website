import type { CSSProperties } from "react";
import { isDatabaseConfigured } from "./prisma";
import {
  parseFreeformLayers,
  parseStoredNavItems,
  type HeroFreeformLayer,
  type StoredNavItem,
} from "./cms-types";
import { parseHomePageCopy, type HomePageCopy } from "./home-page-copy";

export type LocaleCode = "en" | "ar";

export type PublicHeroStat = { id: string; value: string; label: string };

export type PublicHeroSlide = {
  id: number;
  layoutMode: "structured" | "freeform";
  freeformLayers: HeroFreeformLayer[] | null;
  image: string;
  active: boolean;
  badge: string;
  titleLine1: string;
  titleLine2: string;
  desc: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  stats: PublicHeroStat[];
};

export type PublicTrustItem = {
  id: number;
  text: string;
  iconKey: string;
};

export type PublicSpotlightItem = {
  id: number;
  label: string;
  href: string;
  imageUrl: string | null;
  iconKey: string | null;
};

/** Showroom / gallery tiles from `ShowroomMedia` (admin CMS). */
export type PublicShowroomItem = {
  id: number;
  url: string;
  kind: string;
  /** Localized caption for accessibility / optional UI */
  title: string;
};

/** Promo tiles from `PromoBanner` (admin CMS). */
export type PublicPromoBanner = {
  id: number;
  title: string;
  sub: string;
  imageUrl: string;
  href: string;
};

export type HomeCmsPayload = {
  trustBar: PublicTrustItem[];
  /** CSS `background` for the trust strip (rgba from SiteConfig trust bar color + opacity) */
  trustBarBackground: string;
  /** Label text color */
  trustBarTextColor: string;
  /** Icon stroke color */
  trustBarIconColor: string;
  spotlights: PublicSpotlightItem[];
  hero: {
    slides: PublicHeroSlide[];
    autoplayMs: number;
    /** Black overlay alpha 0–1 (from SiteConfig.heroScrimOpacityPct / 100) */
    scrimOpacity: number;
    /** Resolved CSS `color` for prev/next chevrons (Lucide uses currentColor) */
    navArrowColor: string;
    /** Resolved CSS `background` for arrow button boxes */
    navBoxBackground: string;
  };
  /** Parsed nav JSON from DB, or null to use built-in `NAV_ITEMS` in NavBar */
  navItems: StoredNavItem[] | null;
  /** From `showroomMedia` — when non-empty, `StoreGallery` uses these URLs */
  showroom: PublicShowroomItem[];
  /** From `promoBanner` — when enough rows exist, homepage promo rows use them */
  promoBanners: PublicPromoBanner[];
  /** Optional homepage copy overrides from `SiteConfig.homePageCopyJson` */
  pageCopy: HomePageCopy | null;
};

function parseStats(raw: unknown): PublicHeroStat[] {
  if (!Array.isArray(raw)) return [];
  const out: PublicHeroStat[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : String(out.length);
    const value = typeof o.value === "string" ? o.value : "";
    const label = typeof o.label === "string" ? o.label : "";
    if (value || label) out.push({ id, value, label });
  }
  return out;
}

export function staticHomeCms(locale: LocaleCode): HomeCmsPayload {
  const en = locale === "en";
  return {
    trustBarBackground: "rgba(3, 7, 18, 1)",
    trustBarTextColor: "#f8fafc",
    trustBarIconColor: "var(--fz-primary)",
    trustBar: [
      { id: 1, text: en ? "Fast Nationwide Delivery" : "توصيل سريع", iconKey: "truck" },
      { id: 2, text: en ? "100% Genuine Products" : "منتجات أصلية 100٪", iconKey: "shield-check" },
      { id: 3, text: en ? "Easy 30-Day Returns" : "إرجاع خلال 30 يوماً", iconKey: "repeat" },
      { id: 4, text: en ? "24/7 Expert Support" : "دعم فني متواصل", iconKey: "headphones" },
    ],
    spotlights: [
      { id: 1, label: en ? "Laptops" : "لابتوبات", href: "/products?cat=gaming", imageUrl: null, iconKey: "laptop" },
      { id: 2, label: en ? "Monitors" : "شاشات", href: "/products?cat=monitors", imageUrl: null, iconKey: "monitor" },
      { id: 3, label: en ? "Gaming PCs" : "أجهزة ألعاب", href: "/products?cat=components", imageUrl: null, iconKey: "gamepad-2" },
      { id: 4, label: en ? "Components" : "مكونات", href: "/products?cat=components", imageUrl: null, iconKey: "cpu" },
      { id: 5, label: en ? "Accessories" : "إكسسوارات", href: "/products?cat=accessories", imageUrl: null, iconKey: "headphones" },
      { id: 6, label: en ? "Printers" : "طابعات", href: "/products?cat=printers", imageUrl: null, iconKey: "printer" },
      { id: 7, label: en ? "Network" : "شبكات", href: "/products?cat=network", imageUrl: null, iconKey: "shield-check" },
      { id: 8, label: en ? "Cables" : "كوابل", href: "/products?cat=accessories", imageUrl: null, iconKey: "package" },
    ],
    showroom: [],
    promoBanners: [],
    hero: {
      autoplayMs: 7000,
      scrimOpacity: 0.25,
      navArrowColor: "rgba(255, 255, 255, 0.8)",
      navBoxBackground: "rgba(255, 255, 255, 0.08)",
      slides: [
        {
          id: 1,
          layoutMode: "structured",
          freeformLayers: null,
          image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920",
          active: true,
          badge: en ? "NEW ARRIVAL" : "وصل حديثاً",
          titleLine1: en ? "PREDATOR " : "بريداتور ",
          titleLine2: en ? "UNLEASHED" : "مُطلَق",
          desc: en
            ? "Dominate the battlefield with unrivaled power — 240Hz displays and revolutionary cooling."
            : "سيطر بأداء لا مثيل له — شاشات 240Hz وتبريد متطور.",
          primaryLabel: en ? "VIEW DETAILS" : "التفاصيل",
          primaryHref: "/products?cat=gaming",
          secondaryLabel: en ? "ALL GAMING" : "كل الألعاب",
          secondaryHref: "/products?cat=gaming",
          stats: [
            { id: "a", value: "240Hz", label: en ? "DISPLAY" : "شاشة" },
            { id: "b", value: "RTX", label: en ? "GRAPHICS" : "جرافيك" },
            { id: "c", value: "<1ms", label: en ? "RESPONSE" : "استجابة" },
          ],
        },
      ],
    },
    navItems: null,
    pageCopy: null,
  };
}

export type CmsHeroSlideRow = {
  id: number;
  sortOrder: number;
  layoutMode?: string | null;
  freeformLayers?: unknown | null;
  badgeEn: string;
  badgeAr: string;
  titleLine1En: string;
  titleLine1Ar: string;
  titleLine2En: string;
  titleLine2Ar: string;
  descEn: string;
  descAr: string;
  imageUrl: string;
  primaryLabelEn: string;
  primaryLabelAr: string;
  primaryHref: string;
  secondaryLabelEn: string;
  secondaryLabelAr: string;
  secondaryHref: string;
  active: boolean;
  stats: unknown;
};

function mapHeroRow(row: CmsHeroSlideRow, locale: LocaleCode): PublicHeroSlide {
  const en = locale === "en";
  const layoutMode = row.layoutMode === "freeform" ? "freeform" : "structured";
  return {
    id: row.id,
    layoutMode,
    freeformLayers: parseFreeformLayers(row.freeformLayers ?? null),
    image: row.imageUrl,
    active: row.active,
    badge: en ? row.badgeEn : row.badgeAr,
    titleLine1: en ? row.titleLine1En : row.titleLine1Ar,
    titleLine2: en ? row.titleLine2En : row.titleLine2Ar,
    desc: en ? row.descEn : row.descAr,
    primaryLabel: en ? row.primaryLabelEn : row.primaryLabelAr,
    primaryHref: row.primaryHref,
    secondaryLabel: en ? row.secondaryLabelEn : row.secondaryLabelAr,
    secondaryHref: row.secondaryHref,
    stats: parseStats(row.stats),
  };
}

function clampHeroScrimOpacityPct(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 25;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const s = hex.trim().replace(/^#/, "");
  if (s.length === 6) {
    const n = parseInt(s, 16);
    if (!Number.isNaN(n)) return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  return { r: 3, g: 7, b: 18 };
}

function clampHeroNavOpacityPct(raw: unknown, def: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Build `rgba(...)` for hero arrow icon or button box from hex + 0–100 opacity. */
function heroNavLayerRgba(
  colorHex: string | null | undefined,
  opacityPct: number | null | undefined,
  defaultHex: string,
  defaultOpacityPct: number,
): string {
  const rgb = hexToRgb((colorHex && colorHex.trim()) || defaultHex);
  const pct = clampHeroNavOpacityPct(opacityPct ?? defaultOpacityPct, defaultOpacityPct);
  const a = pct / 100;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function clampTrustBarBgOpacityPct(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 100;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Resolved CSS background for the homepage trust strip */
export function trustBarBackgroundCss(
  color: string | null | undefined,
  opacityPct: number | null | undefined,
): string {
  const rgb = hexToRgb((color && color.trim()) || "#030712");
  const a = clampTrustBarBgOpacityPct(opacityPct ?? 100) / 100;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function trustBarCssColor(raw: string | null | undefined, fallback: string): string {
  const s = raw?.trim();
  if (s) return s.slice(0, 64);
  return fallback;
}

/** CSS variables for trust strip text + icon colors (set on `.featuresBar` / preview root). */
export function trustBarChromeStyle(
  home: Pick<HomeCmsPayload, "trustBarTextColor" | "trustBarIconColor">,
): CSSProperties {
  return {
    ["--trust-bar-text" as string]: home.trustBarTextColor,
    ["--trust-bar-icon" as string]: home.trustBarIconColor,
  };
}

type SiteCfgExt = {
  heroAutoplayMs?: number | null;
  heroScrimOpacityPct?: number | null;
  heroNavArrowColor?: string | null;
  heroNavArrowOpacityPct?: number | null;
  heroNavBoxColor?: string | null;
  heroNavBoxOpacityPct?: number | null;
  trustBarBgColor?: string | null;
  trustBarBgOpacityPct?: number | null;
  trustBarTextColor?: string | null;
  trustBarIconColor?: string | null;
  navItemsJson?: unknown | null;
  homePageCopyJson?: unknown | null;
};

/** Build home CMS payload from DB-shaped rows (used by storefront + admin live preview). */
export function composeHomeCmsFromParts(
  cfg: SiteCfgExt | null,
  trust: { id: number; textEn: string; textAr: string; iconKey: string }[],
  spots: {
    id: number;
    labelEn: string;
    labelAr: string;
    href: string;
    imageUrl: string | null;
    iconKey: string | null;
    active?: boolean;
  }[],
  heroes: CmsHeroSlideRow[],
  locale: LocaleCode,
): HomeCmsPayload {
  const en = locale === "en";
  const fallback = staticHomeCms(locale);
  if (!cfg) return fallback;

  const autoplayMs =
    typeof cfg.heroAutoplayMs === "number" && cfg.heroAutoplayMs >= 2000
      ? cfg.heroAutoplayMs
      : 7000;

  const scrimOpacity = clampHeroScrimOpacityPct(cfg.heroScrimOpacityPct ?? 25) / 100;

  const trustBarBackground = trustBarBackgroundCss(cfg.trustBarBgColor, cfg.trustBarBgOpacityPct);
  const trustBarTextColor = trustBarCssColor(cfg.trustBarTextColor, "#f8fafc");
  const trustBarIconColor = trustBarCssColor(cfg.trustBarIconColor, "var(--fz-primary)");

  const navItems = cfg.navItemsJson != null ? parseStoredNavItems(cfg.navItemsJson) : null;

  const trustBar: PublicTrustItem[] =
    trust.length > 0
      ? trust.map((t) => ({
          id: t.id,
          text: en ? t.textEn : t.textAr,
          iconKey: t.iconKey || "truck",
        }))
      : fallback.trustBar;

  const activeSpots = spots.filter((s) => s.active !== false);
  const spotlights: PublicSpotlightItem[] =
    activeSpots.length > 0
      ? activeSpots.map((s) => ({
          id: s.id,
          label: en ? s.labelEn : s.labelAr,
          href: s.href,
          imageUrl: s.imageUrl,
          iconKey: s.iconKey,
        }))
      : fallback.spotlights;

  const slideRows = heroes.filter((h) => h.active);
  const slides: PublicHeroSlide[] =
    slideRows.length > 0 ? slideRows.map((h) => mapHeroRow(h, locale)) : fallback.hero.slides;

  const navArrowColor = heroNavLayerRgba(
    cfg.heroNavArrowColor,
    cfg.heroNavArrowOpacityPct,
    "#ffffff",
    80,
  );
  const navBoxBackground = heroNavLayerRgba(
    cfg.heroNavBoxColor,
    cfg.heroNavBoxOpacityPct,
    "#ffffff",
    8,
  );

  return {
    trustBar,
    trustBarBackground,
    trustBarTextColor,
    trustBarIconColor,
    spotlights,
    hero: { slides, autoplayMs, scrimOpacity, navArrowColor, navBoxBackground },
    navItems,
    showroom: [],
    promoBanners: [],
    pageCopy: parseHomePageCopy(cfg?.homePageCopyJson),
  };
}

export async function getHomeCms(locale: LocaleCode): Promise<HomeCmsPayload> {
  if (!isDatabaseConfigured()) {
    return staticHomeCms(locale);
  }
  const { fetchStorefrontBootstrap } = await import("./storefront-bootstrap");
  return (await fetchStorefrontBootstrap(locale)).home;
}
