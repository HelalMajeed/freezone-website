import type { Category } from "@/lib/data";
import type { PublicSpotlightItem } from "@/lib/layout-cms";
import { PROMO_MEGA_MAX_CARDS } from "@/lib/home-promo-mega";

/**
 * Pick a Lucide icon key from category slug + display names (EN/AR).
 * Used for the homepage icon strip when no manual icon is set.
 */
export function inferCategoryIconKey(slug: string, nameEn: string, nameAr = ""): string {
  const s = slug.toLowerCase().trim();
  const hay = `${slug} ${nameEn} ${nameAr}`.toLowerCase();

  const bySlug: Record<string, string> = {
    gaming: "gamepad-2",
    security: "shield-check",
    cctv: "camera",
    computers: "laptop",
    laptops: "laptop",
    monitors: "monitor",
    printers: "printer",
    electric: "plug",
    software: "hard-drive",
    hardware: "cpu",
    components: "cpu",
    accessories: "headphones",
    "all-in-one": "tv",
    "smart-home": "plug",
    phones: "smartphone",
    tablets: "tablet",
    "power-solutions": "zap",
    network: "network",
  };
  if (bySlug[s]) return bySlug[s];

  if (/\b(gaming|game|playstation|xbox|ألعاب|العاب)\b/.test(hay)) return "gamepad-2";
  if (/\b(cctv|surveillance|nvr|dvr|مراقبة|كاميرا)\b/.test(hay)) return "camera";
  if (/\b(security|alarm|أمن|حماية)\b/.test(hay)) return "shield-check";
  if (/\b(laptop|notebook|لابتوب|حاسوب محمول)\b/.test(hay)) return "laptop";
  if (/\b(monitor|display|screen|شاشة|شاشات)\b/.test(hay)) return "monitor";
  if (/\b(printer|طابعة|طابعات)\b/.test(hay)) return "printer";
  if (/\b(tablet|ipad|تابلت|أيباد)\b/.test(hay)) return "tablet";
  if (/\b(phone|mobile|هاتف|هواتف|جوال)\b/.test(hay)) return "smartphone";
  if (/\b(network|router|wifi|شبكة|شبكات|واي فاي)\b/.test(hay)) return "network";
  if (/\b(cable|كابل|كوابل)\b/.test(hay)) return "cable";
  if (/\b(headphone|earphone|سماعة|إكسسوار|اكسسوار)\b/.test(hay)) return "headphones";
  if (/\b(mouse|فأرة|ماوس)\b/.test(hay)) return "mouse";
  if (/\b(keyboard|لوحة مفاتيح)\b/.test(hay)) return "keyboard";
  if (/\b(storage|ssd|hdd|تخزين)\b/.test(hay)) return "hard-drive";
  if (/\b(component|cpu|gpu|ram|motherboard|مكون|معالج|كرت)\b/.test(hay)) return "cpu";
  if (/\b(power|ups|battery|طاقة|بطارية)\b/.test(hay)) return "zap";
  if (/\b(electric|plug|كهرباء)\b/.test(hay)) return "plug";
  if (/\b(software|برمج|سوفت)\b/.test(hay)) return "hard-drive";
  if (/\b(smart[\s-]?home|منزل ذكي)\b/.test(hay)) return "plug";
  if (/\b(all[\s-]?in[\s-]?one)\b/.test(hay)) return "tv";
  if (/\b(computers?|pc|حاسوب|كمبيوتر)\b/.test(hay)) return "laptop";

  return "package";
}

/** Spotlight row for CategoryIconStrip — same catalog order as promo mega cards. */
export function buildCategorySpotlightsFromCatalog(
  categories: Category[],
  locale: "en" | "ar",
  max = PROMO_MEGA_MAX_CARDS,
): PublicSpotlightItem[] {
  const limit = Math.min(max, categories.length);
  return categories.slice(0, limit).map((cat, i) => ({
    id: i + 1,
    label: locale === "ar" ? (cat.nameAr?.trim() || cat.name) : cat.name,
    href: `/products?cat=${encodeURIComponent(cat.id)}`,
    imageUrl: null,
    iconKey: inferCategoryIconKey(cat.id, cat.name, cat.nameAr ?? ""),
  }));
}
