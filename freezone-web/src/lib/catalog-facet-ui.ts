import type { FacetFilterDefinition } from "@/lib/catalog-products-api";
import { FACET_ADMIN_LABEL_AR, FACET_ADMIN_LABEL_EN } from "@/lib/facet-admin-labels";

/** Preferred sidebar order for laptop-style catalogs (Global Iraq–like). */
export const LAPTOP_FACET_ORDER: string[] = [
  "availability",
  "brand",
  "price",
  "product_type",
  "processor_family",
  "gpu_model",
  "graphics_card",
  "ram_size",
  "storage_size",
  "storage_type",
  "display_resolution",
  "screen_size",
  "refresh_rate",
  "memory_technology",
  "ram_type",
  "display_panel",
  "panel_type",
];

const FACET_ORDER_BY_CATEGORY: Record<string, string[]> = {
  laptops: LAPTOP_FACET_ORDER,
  gaming: LAPTOP_FACET_ORDER,
  computers: LAPTOP_FACET_ORDER,
  "all-in-one": LAPTOP_FACET_ORDER,
};

const FACET_LABEL_OVERRIDES: Record<string, { en: string; ar: string }> = {
  processor_family: { en: "Processor family", ar: "عائلة المعالج" },
  gpu_model: { en: "Graphics Card", ar: "كرت الشاشة" },
  graphics_card: { en: "Graphics Card", ar: "كرت الشاشة" },
  ram_size: { en: "RAM", ar: "الرام" },
  storage_size: { en: "Storage", ar: "التخزين" },
  storage_type: { en: "Storage type", ar: "نوع التخزين" },
  screen_size: { en: "Screen Size", ar: "مقاس الشاشة" },
  display_resolution: { en: "Display resolution", ar: "دقة الشاشة" },
  refresh_rate: { en: "Refresh rate", ar: "معدل التحديث" },
  memory_technology: { en: "Memory technology", ar: "تقنية الذاكرة" },
  ram_type: { en: "Memory technology", ar: "تقنية الذاكرة" },
  display_panel: { en: "Display panel", ar: "نوع اللوحة" },
  panel_type: { en: "Display panel", ar: "نوع اللوحة" },
  product_type: { en: "Product type", ar: "نوع المنتج" },
};

function rtxSortKey(label: string): number {
  const m = label.match(/(\d{3,4})/);
  return m ? parseInt(m[1], 10) : 9999;
}

function numericSortKey(label: string): number {
  const n = parseFloat(label.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 9999;
}

export function getFacetDisplayLabel(key: string, locale: "en" | "ar", apiLabel?: string): string {
  const override = FACET_LABEL_OVERRIDES[key];
  if (override) return locale === "ar" ? override.ar : override.en;
  if (apiLabel?.trim()) return apiLabel.trim();
  const fromMap = locale === "ar" ? FACET_ADMIN_LABEL_AR[key] : FACET_ADMIN_LABEL_EN[key];
  if (fromMap) return fromMap;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function sortFacetOptionsNatural(
  facetKey: string,
  options: { value: string; label: string; count: number }[],
): { value: string; label: string; count: number }[] {
  const key = facetKey.toLowerCase();
  const arr = [...options];
  if (key === "gpu_model" || key === "graphics_card" || key === "gpu") {
    return arr.sort((a, b) => rtxSortKey(a.label) - rtxSortKey(b.label));
  }
  if (key === "ram_size" || key === "storage_size" || key === "screen_size" || key === "refresh_rate") {
    return arr.sort((a, b) => numericSortKey(a.label) - numericSortKey(b.label));
  }
  if (key === "processor_family" || key === "cpu") {
    const rank = (l: string) => {
      const s = l.toLowerCase();
      if (s.includes("core i3")) return 10;
      if (s.includes("core i5")) return 20;
      if (s.includes("core i7")) return 30;
      if (s.includes("core i9")) return 40;
      if (s.includes("ryzen 5")) return 50;
      if (s.includes("ryzen 7")) return 60;
      if (s.includes("ryzen 9")) return 70;
      if (s.includes("ultra 7")) return 80;
      if (s.includes("ultra 9")) return 90;
      return 100;
    };
    return arr.sort((a, b) => rank(a.label) - rank(b.label) || a.label.localeCompare(b.label));
  }
  return arr.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

export function facetSortIndex(catSlug: string, facetKey: string): number {
  const order = FACET_ORDER_BY_CATEGORY[catSlug] ?? LAPTOP_FACET_ORDER;
  const i = order.indexOf(facetKey);
  return i === -1 ? 900 + facetKey.charCodeAt(0) : i;
}

export function orderServerFacetFilters(
  catSlug: string,
  filters: FacetFilterDefinition[],
): FacetFilterDefinition[] {
  return [...filters].sort(
    (a, b) => facetSortIndex(catSlug, a.key) - facetSortIndex(catSlug, b.key),
  );
}

export const FACET_OPTIONS_VISIBLE_DEFAULT = 8;
