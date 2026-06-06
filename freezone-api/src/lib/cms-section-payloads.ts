/**
 * Frozen homepage section payload schemas — contract (j) in
 * docs/API_CONTRACTS.md. These five types are the editor⇄storefront
 * interface; unknown extra keys are preserved on write and must be ignored
 * by renderers. Every `id` inside payload arrays is a client-generated
 * stable string (drag/drop + React keys).
 */

export type BannerSliderItem = {
  id: string;
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
  badgeAr: string;
  badgeEn: string;
  imageUrl: string;
  imageUrlMobile: string;
  href: string;
  active: boolean;
};

export type BannerSliderPayload = {
  /** 0 = no autoplay; otherwise 2000–20000 ms. */
  autoplayMs: number;
  aspect: "wide" | "banner";
  items: BannerSliderItem[]; // 1..10
};

export type CategoriesShowcaseItem = {
  id: string;
  categorySlug: string;
  labelAr: string;
  labelEn: string;
  imageUrl: string;
  href: string;
};

export type CategoriesShowcasePayload = {
  source: "gaming_grid" | "manual";
  titleAr: string;
  titleEn: string;
  items: CategoriesShowcaseItem[]; // manual mode: 2..12
};

export type PromoGridItem = {
  id: string;
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
  ctaAr: string;
  ctaEn: string;
  imageUrl: string;
  href: string;
  catSlug: string;
};

export type PromoGridPayload = {
  layout: "2x2" | "3x1" | "1+2";
  items: PromoGridItem[]; // 1..6
};

export type TabbedProductsTabMode =
  | "new"
  | "featured"
  | "gaming"
  | "components"
  | "category"
  | "brand"
  | "manual";

export type TabbedProductsTab = {
  id: string;
  labelAr: string;
  labelEn: string;
  mode: TabbedProductsTabMode;
  categorySlug: string;
  brandSlug: string;
  productIds: number[];
};

export type TabbedProductsPayload = {
  eyebrowAr: string;
  eyebrowEn: string;
  titleAr: string;
  titleEn: string;
  viewAllLink: string;
  limit: number; // 4..48
  tabStyle: "grouped" | "underline";
  tabs: TabbedProductsTab[]; // 1..6
};

export type FaqItem = {
  id: string;
  qAr: string;
  qEn: string;
  aAr: string;
  aEn: string;
};

export type FaqPayload = {
  source: "i18n" | "manual";
  titleAr: string;
  titleEn: string;
  items: FaqItem[]; // manual mode: 1..20
};

export const VALIDATED_SECTION_TYPES = [
  "banner_slider",
  "categories_showcase",
  "promo_grid",
  "tabbed_products",
  "faq",
] as const;
export type ValidatedSectionType = (typeof VALIDATED_SECTION_TYPES)[number];

export function isValidatedSectionType(type: string): type is ValidatedSectionType {
  return (VALIDATED_SECTION_TYPES as readonly string[]).includes(type);
}

export type SectionPayloadResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; errors: string[] };

/**
 * Validate + normalize a draft payload for one of the five frozen section
 * types. Optional string fields default to ""; numbers are clamped to the
 * contract ranges; structural problems (missing item ids, missing required
 * imageUrl/href, item counts out of bounds, bad modes) are reported as
 * errors. Unknown extra keys are preserved (renderers ignore them).
 * Types outside the frozen five pass through unchanged.
 */
export function validateSectionPayload(type: string, raw: unknown): SectionPayloadResult {
  if (!isValidatedSectionType(type)) {
    return { ok: true, payload: asObject(raw) ?? {} };
  }
  const obj = asObject(raw);
  if (!obj) return { ok: false, errors: ["payload must be a JSON object"] };

  switch (type) {
    case "banner_slider":
      return validateBannerSlider(obj);
    case "categories_showcase":
      return validateCategoriesShowcase(obj);
    case "promo_grid":
      return validatePromoGrid(obj);
    case "tabbed_products":
      return validateTabbedProducts(obj);
    case "faq":
      return validateFaq(obj);
  }
}

// ---------------------------------------------------------------------------

function validateBannerSlider(obj: Record<string, unknown>): SectionPayloadResult {
  const errors: string[] = [];
  const items = itemArray(obj.items, 1, 10, "items", errors);
  const normalized = (items ?? []).map((item, i) => {
    const id = str(item.id);
    if (!id) errors.push(`items[${i}].id is required`);
    const imageUrl = str(item.imageUrl);
    if (!imageUrl) errors.push(`items[${i}].imageUrl is required`);
    const href = str(item.href);
    if (!href) errors.push(`items[${i}].href is required`);
    return {
      ...item,
      id,
      titleAr: str(item.titleAr),
      titleEn: str(item.titleEn),
      subAr: str(item.subAr),
      subEn: str(item.subEn),
      badgeAr: str(item.badgeAr),
      badgeEn: str(item.badgeEn),
      imageUrl,
      imageUrlMobile: str(item.imageUrlMobile),
      href,
      active: item.active !== false,
    };
  });
  if (errors.length) return { ok: false, errors };

  const autoplayRaw = num(obj.autoplayMs, 6000);
  const autoplayMs = autoplayRaw <= 0 ? 0 : clamp(Math.round(autoplayRaw), 2000, 20000);
  return {
    ok: true,
    payload: {
      ...obj,
      autoplayMs,
      aspect: obj.aspect === "banner" ? "banner" : "wide",
      items: normalized,
    },
  };
}

function validateCategoriesShowcase(obj: Record<string, unknown>): SectionPayloadResult {
  const errors: string[] = [];
  const source = obj.source === "manual" ? "manual" : "gaming_grid";
  let normalized: Record<string, unknown>[] = [];
  if (source === "manual") {
    const items = itemArray(obj.items, 2, 12, "items", errors);
    normalized = (items ?? []).map((item, i) => {
      const id = str(item.id);
      if (!id) errors.push(`items[${i}].id is required`);
      const categorySlug = str(item.categorySlug);
      const imageUrl = str(item.imageUrl);
      if (!categorySlug && !imageUrl) {
        errors.push(`items[${i}] needs categorySlug or imageUrl`);
      }
      return {
        ...item,
        id,
        categorySlug,
        labelAr: str(item.labelAr),
        labelEn: str(item.labelEn),
        imageUrl,
        href: str(item.href),
      };
    });
  } else if (Array.isArray(obj.items)) {
    /** "gaming_grid" preset ignores items — keep whatever the editor stored. */
    normalized = obj.items.filter((x): x is Record<string, unknown> => Boolean(asObject(x)));
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    payload: {
      ...obj,
      source,
      titleAr: str(obj.titleAr),
      titleEn: str(obj.titleEn),
      items: normalized,
    },
  };
}

function validatePromoGrid(obj: Record<string, unknown>): SectionPayloadResult {
  const errors: string[] = [];
  const items = itemArray(obj.items, 1, 6, "items", errors);
  const normalized = (items ?? []).map((item, i) => {
    const id = str(item.id);
    if (!id) errors.push(`items[${i}].id is required`);
    const imageUrl = str(item.imageUrl);
    if (!imageUrl) errors.push(`items[${i}].imageUrl is required`);
    const href = str(item.href);
    if (!href) errors.push(`items[${i}].href is required`);
    return {
      ...item,
      id,
      titleAr: str(item.titleAr),
      titleEn: str(item.titleEn),
      subAr: str(item.subAr),
      subEn: str(item.subEn),
      ctaAr: str(item.ctaAr),
      ctaEn: str(item.ctaEn),
      imageUrl,
      href,
      catSlug: str(item.catSlug),
    };
  });
  if (errors.length) return { ok: false, errors };
  const layout = obj.layout === "3x1" || obj.layout === "1+2" ? obj.layout : "2x2";
  return { ok: true, payload: { ...obj, layout, items: normalized } };
}

const TAB_MODES: TabbedProductsTabMode[] = [
  "new",
  "featured",
  "gaming",
  "components",
  "category",
  "brand",
  "manual",
];

function validateTabbedProducts(obj: Record<string, unknown>): SectionPayloadResult {
  const errors: string[] = [];
  const tabs = itemArray(obj.tabs, 1, 6, "tabs", errors);
  const normalized = (tabs ?? []).map((tab, i) => {
    const id = str(tab.id);
    if (!id) errors.push(`tabs[${i}].id is required`);
    const mode = (TAB_MODES as string[]).includes(str(tab.mode)) ? (tab.mode as TabbedProductsTabMode) : null;
    if (!mode) errors.push(`tabs[${i}].mode must be one of: ${TAB_MODES.join(", ")}`);
    const categorySlug = str(tab.categorySlug);
    const brandSlug = str(tab.brandSlug);
    const productIds = Array.isArray(tab.productIds)
      ? tab.productIds.filter(
          (n): n is number => typeof n === "number" && Number.isInteger(n) && n > 0,
        )
      : [];
    if (mode === "category" && !categorySlug) errors.push(`tabs[${i}].categorySlug required for mode "category"`);
    if (mode === "brand" && !brandSlug) errors.push(`tabs[${i}].brandSlug required for mode "brand"`);
    if (mode === "manual" && (productIds.length < 1 || productIds.length > 48)) {
      errors.push(`tabs[${i}].productIds must have 1..48 ids for mode "manual"`);
    }
    return {
      ...tab,
      id,
      labelAr: str(tab.labelAr),
      labelEn: str(tab.labelEn),
      mode: mode ?? "new",
      categorySlug,
      brandSlug,
      productIds,
    };
  });
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    payload: {
      ...obj,
      eyebrowAr: str(obj.eyebrowAr),
      eyebrowEn: str(obj.eyebrowEn),
      titleAr: str(obj.titleAr),
      titleEn: str(obj.titleEn),
      viewAllLink: str(obj.viewAllLink) || "/products",
      limit: clamp(Math.round(num(obj.limit, 24)), 4, 48),
      tabStyle: obj.tabStyle === "underline" ? "underline" : "grouped",
      tabs: normalized,
    },
  };
}

function validateFaq(obj: Record<string, unknown>): SectionPayloadResult {
  const errors: string[] = [];
  const source = obj.source === "manual" ? "manual" : "i18n";
  let normalized: Record<string, unknown>[] = [];
  if (source === "manual") {
    const items = itemArray(obj.items, 1, 20, "items", errors);
    normalized = (items ?? []).map((item, i) => {
      const id = str(item.id);
      if (!id) errors.push(`items[${i}].id is required`);
      const qAr = str(item.qAr);
      const qEn = str(item.qEn);
      const aAr = str(item.aAr);
      const aEn = str(item.aEn);
      if (!qAr && !qEn) errors.push(`items[${i}] needs a question (qAr or qEn)`);
      if (!aAr && !aEn) errors.push(`items[${i}] needs an answer (aAr or aEn)`);
      return { ...item, id, qAr, qEn, aAr, aEn };
    });
  } else if (Array.isArray(obj.items)) {
    normalized = obj.items.filter((x): x is Record<string, unknown> => Boolean(asObject(x)));
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    payload: {
      ...obj,
      source,
      titleAr: str(obj.titleAr),
      titleEn: str(obj.titleEn),
      items: normalized,
    },
  };
}

// ---------------------------------------------------------------------------

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Validate an items/tabs array bound, pushing errors; returns object rows. */
function itemArray(
  value: unknown,
  min: number,
  max: number,
  field: string,
  errors: string[],
): Record<string, unknown>[] | null {
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array (${min}..${max})`);
    return null;
  }
  const rows = value.map(asObject);
  if (rows.some((r) => r === null)) {
    errors.push(`${field} entries must be objects`);
    return null;
  }
  if (rows.length < min || rows.length > max) {
    errors.push(`${field} must have ${min}..${max} entries`);
    return null;
  }
  return rows as Record<string, unknown>[];
}
