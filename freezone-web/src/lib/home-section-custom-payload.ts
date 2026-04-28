import type { PublicHeroSlide, PublicSpotlightItem, PublicTrustItem } from "@/lib/layout-cms";

function asObj(p: unknown): Record<string, unknown> {
  return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
}

/** Build hero preview for HeroSlider when section payload uses source "custom". */
export function buildHeroPreviewFromPayload(
  payload: Record<string, unknown>,
  locale: "en" | "ar",
  fallbackAutoplay: number,
  fallbackScrimOpacity: number,
  navChrome: { navArrowColor: string; navBoxBackground: string },
): {
  slides: PublicHeroSlide[];
  autoplayMs: number;
  scrimOpacity: number;
  navArrowColor: string;
  navBoxBackground: string;
} | null {
  if (payload.source !== "custom" || !Array.isArray(payload.slides)) return null;
  const en = locale === "en";
  const slides: PublicHeroSlide[] = [];
  let i = 0;
  for (const raw of payload.slides) {
    const o = asObj(raw);
    const image = typeof o.image === "string" ? o.image.trim() : "";
    if (!image) continue;
    slides.push({
      id: typeof o.id === "number" && Number.isFinite(o.id) ? o.id : i + 1,
      layoutMode: "structured",
      freeformLayers: null,
      image,
      active: o.active !== false,
      badge: en ? String(o.badgeEn ?? o.badge ?? "") : String(o.badgeAr ?? o.badge ?? ""),
      titleLine1: en ? String(o.titleLine1En ?? "") : String(o.titleLine1Ar ?? ""),
      titleLine2: en ? String(o.titleLine2En ?? "") : String(o.titleLine2Ar ?? ""),
      desc: en ? String(o.descEn ?? "") : String(o.descAr ?? ""),
      primaryLabel: en ? String(o.primaryLabelEn ?? "") : String(o.primaryLabelAr ?? ""),
      primaryHref: typeof o.primaryHref === "string" && o.primaryHref ? o.primaryHref : "/products",
      secondaryLabel: en ? String(o.secondaryLabelEn ?? "") : String(o.secondaryLabelAr ?? ""),
      secondaryHref: typeof o.secondaryHref === "string" && o.secondaryHref ? o.secondaryHref : "/products",
      stats: [],
    });
    i++;
  }
  if (slides.length === 0) return null;
  const autoplayMs =
    typeof payload.autoplayMs === "number" && payload.autoplayMs >= 2000
      ? payload.autoplayMs
      : fallbackAutoplay;
  const scrimPctRaw = payload.scrimOpacityPct;
  const scrimPct =
    typeof scrimPctRaw === "number" && Number.isFinite(scrimPctRaw)
      ? Math.min(100, Math.max(0, Math.round(scrimPctRaw)))
      : null;
  const scrimOpacity =
    scrimPct !== null ? scrimPct / 100 : fallbackScrimOpacity;
  return {
    slides,
    autoplayMs,
    scrimOpacity,
    navArrowColor: navChrome.navArrowColor,
    navBoxBackground: navChrome.navBoxBackground,
  };
}

export function buildTrustItemsFromPayload(
  payload: Record<string, unknown>,
  locale: "en" | "ar",
): PublicTrustItem[] | null {
  if (payload.source !== "custom" || !Array.isArray(payload.items)) return null;
  const en = locale === "en";
  const out: PublicTrustItem[] = [];
  let i = 0;
  for (const raw of payload.items) {
    const o = asObj(raw);
    const iconKey = typeof o.iconKey === "string" ? o.iconKey.trim() : "truck";
    const text = en ? String(o.textEn ?? "").trim() : String(o.textAr ?? "").trim();
    if (!text) continue;
    out.push({ id: typeof o.id === "number" ? o.id : i + 1, text, iconKey });
    i++;
  }
  return out.length ? out : null;
}

export function buildCategorySpotsFromPayload(
  payload: Record<string, unknown>,
  locale: "en" | "ar",
): PublicSpotlightItem[] | null {
  if (payload.source !== "custom" || !Array.isArray(payload.spots)) return null;
  const en = locale === "en";
  const out: PublicSpotlightItem[] = [];
  let i = 0;
  for (const raw of payload.spots) {
    const o = asObj(raw);
    const href = typeof o.href === "string" && o.href.trim() ? o.href.trim() : "/products";
    const label = en ? String(o.labelEn ?? "").trim() : String(o.labelAr ?? "").trim();
    if (!label) continue;
    const imageUrl =
      typeof o.imageUrl === "string" && o.imageUrl.trim() ? o.imageUrl.trim() : null;
    const iconKey =
      typeof o.iconKey === "string" && o.iconKey.trim() ? o.iconKey.trim() : "laptop";
    out.push({
      id: typeof o.id === "number" ? o.id : i + 1,
      label,
      href,
      imageUrl,
      iconKey,
    });
    i++;
  }
  return out.length ? out : null;
}
