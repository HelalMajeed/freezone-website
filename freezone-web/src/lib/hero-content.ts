/**
 * Hero content quality guard + premium FreeZone fallback slides.
 *
 * The storefront hero is CMS/DB-driven (HeroSlide rows surfaced via
 * /api/ssr/storefront-bootstrap). If those rows are empty or contain
 * placeholder text (e.g. "TITLE" / "LINE 2" / lorem), the homepage would show
 * garbage or nothing. This module:
 *   1. detects placeholder/empty slides, and
 *   2. supplies premium, bilingual FreeZone campaign slides as a fallback,
 * so the live homepage ALWAYS shows real content — without touching the DB.
 *
 * The real fix for production data is still to add proper slides in
 * /admin → CMS → Hero Slides; this guard just prevents a bad/empty payload
 * from ever reaching the visitor.
 */
import type { PublicHeroSlide, PublicHeroStat, LocaleCode } from "./layout-cms";

/**
 * Synthetic-placeholder patterns. Kept deliberately conservative so a real
 * campaign (incl. brand names like "Predator") is never hidden — we only flag
 * clearly fake/scaffold text and empty titles.
 */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\btitle\b/i,
  /\bline\s*\d+\b/i,
  /\blorem\b/i,
  /\bipsum\b/i,
  /\bplaceholder\b/i,
  /\byour\s+(title|text|heading|content)\b/i,
  /\bsample\s+(text|title|heading)\b/i,
  /^(heading|subtitle|untitled|test|demo)$/i,
  /عنوان رئيسي/,
  /نص تجريبي/,
  /^عنوان$/,
  /^السطر/,
];

function looksPlaceholder(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(t));
}

/** A slide is unusable if its title is empty/placeholder (structured), or a freeform slide has no layers. */
export function isPlaceholderHeroSlide(s: PublicHeroSlide): boolean {
  if (!s) return true;
  if (s.layoutMode === "freeform") {
    return !(s.freeformLayers && s.freeformLayers.length > 0);
  }
  const title = `${s.titleLine1 ?? ""} ${s.titleLine2 ?? ""}`.trim();
  if (looksPlaceholder(title)) return true;
  // Empty title AND empty description → nothing meaningful to show.
  if (!title && !(s.desc ?? "").trim()) return true;
  return false;
}

/**
 * Public-facing slide list: keep only active, non-placeholder slides; if none
 * survive, return the premium FreeZone fallback set.
 */
export function sanitizeHeroSlides(
  slides: PublicHeroSlide[] | null | undefined,
  locale: LocaleCode,
): PublicHeroSlide[] {
  const good = (slides ?? []).filter(
    (s) => s && s.active !== false && !isPlaceholderHeroSlide(s),
  );
  return good.length > 0 ? good : premiumHeroSlides(locale);
}

function stats(locale: LocaleCode): PublicHeroStat[] {
  const en = locale === "en";
  return [
    { id: "a", value: "100%", label: en ? "Genuine" : "أصلي" },
    { id: "b", value: "18", label: en ? "Provinces" : "محافظة" },
    { id: "c", value: en ? "Warranty" : "ضمان", label: en ? "Official" : "رسمي" },
  ];
}

/** Three premium, bilingual FreeZone campaign slides (no hotlinked art — branded gradient). */
export function premiumHeroSlides(locale: LocaleCode): PublicHeroSlide[] {
  const en = locale === "en";
  const base = {
    layoutMode: "structured" as const,
    freeformLayers: null,
    image: "",
    active: true,
  };
  return [
    {
      ...base,
      id: -1,
      badge: en ? "Security & CCTV" : "أنظمة الحماية والمراقبة",
      titleLine1: en ? "PROTECT WHAT" : "احمِ ما يهمّك",
      titleLine2: en ? "MATTERS MOST" : "على مدار الساعة",
      desc: en
        ? "HD & IP cameras, NVR/DVR kits, alarms and smart locks — professional security systems with warranty and support across Iraq."
        : "كاميرات HD و IP، أنظمة تسجيل NVR/DVR، إنذارات وأقفال ذكية — أنظمة حماية احترافية بضمان ودعم في كل العراق.",
      primaryLabel: en ? "Shop CCTV" : "تسوّق كاميرات المراقبة",
      primaryHref: "/products?cat=cctv",
      secondaryLabel: en ? "Security Systems" : "أنظمة الحماية",
      secondaryHref: "/products?cat=security",
      stats: stats(locale),
    },
    {
      ...base,
      id: -2,
      badge: en ? "Gaming & Computers" : "الألعاب والحواسيب",
      titleLine1: en ? "BUILD YOUR" : "اصنع ضبطتك",
      titleLine2: en ? "DREAM SETUP" : "المثالية للألعاب",
      desc: en
        ? "Gaming laptops, custom desktops, high-refresh monitors and the latest components — built for performance, priced for Iraq."
        : "لابتوبات ألعاب، تجميعات مكتبية، شاشات عالية التردد وأحدث القطع — أداء قوي وأسعار تناسب السوق العراقي.",
      primaryLabel: en ? "Shop Gaming" : "تسوّق الألعاب",
      primaryHref: "/products?cat=gaming",
      secondaryLabel: en ? "Computers" : "الحواسيب",
      secondaryHref: "/products?cat=computers",
      stats: stats(locale),
    },
    {
      ...base,
      id: -3,
      badge: en ? "Networking & Smart Home" : "الشبكات والمنزل الذكي",
      titleLine1: en ? "FASTER NETWORKS," : "شبكات أسرع،",
      titleLine2: en ? "SMARTER SPACES" : "ومنازل أذكى",
      desc: en
        ? "Routers, access points, switches and smart-home devices — reliable connectivity and automation for homes and businesses."
        : "راوترات، نقاط وصول، سويتشات وأجهزة منزل ذكي — اتصال موثوق وأتمتة للمنازل والشركات.",
      primaryLabel: en ? "Shop Networking" : "تسوّق الشبكات",
      primaryHref: "/products?cat=networking",
      secondaryLabel: en ? "Smart Home" : "المنزل الذكي",
      secondaryHref: "/products?cat=smart-home",
      stats: stats(locale),
    },
  ];
}
