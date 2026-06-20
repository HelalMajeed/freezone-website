/**
 * Category-aware filter facets vs display specs.
 *
 * Rule: filterable facets are a SHORT, buyer-useful subset per category (used for
 * checkboxes/ranges/URL state). Display specs are the full detail shown on the
 * product card/page. Not every spec becomes a filter.
 */
import { normalizeSpecName, normalizeSpecValue } from "./normalize";

export interface FacetDef {
  key: string;
  nameEn: string;
  nameAr: string;
  type: "select" | "range" | "boolean";
  unit?: string;
}

export const CATEGORY_FILTER_FACETS: Record<string, FacetDef[]> = {
  cctv: [
    { key: "resolution", nameEn: "Resolution", nameAr: "الدقة", type: "select" },
    { key: "camera_type", nameEn: "Camera Type", nameAr: "نوع الكاميرا", type: "select" },
    { key: "indoor_outdoor", nameEn: "Indoor / Outdoor", nameAr: "داخلي / خارجي", type: "select" },
    { key: "night_vision", nameEn: "Night Vision", nameAr: "رؤية ليلية", type: "boolean" },
    { key: "poe", nameEn: "PoE", nameAr: "PoE", type: "boolean" },
    { key: "channels", nameEn: "Channels", nameAr: "عدد القنوات", type: "select" },
    { key: "recorder_type", nameEn: "Recorder (NVR/DVR)", nameAr: "المسجل (NVR/DVR)", type: "select" },
    { key: "storage", nameEn: "Storage", nameAr: "التخزين", type: "select" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
  security: [
    { key: "device_type", nameEn: "Device Type", nameAr: "نوع الجهاز", type: "select" },
    { key: "connectivity", nameEn: "Connectivity", nameAr: "الاتصال", type: "select" },
    { key: "app_support", nameEn: "App Support", nameAr: "دعم التطبيق", type: "boolean" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
  laptops: [
    { key: "cpu", nameEn: "CPU", nameAr: "المعالج", type: "select" },
    { key: "gpu", nameEn: "GPU", nameAr: "كرت الشاشة", type: "select" },
    { key: "ram", nameEn: "RAM", nameAr: "الذاكرة", type: "select", unit: "GB" },
    { key: "ssd", nameEn: "Storage (SSD)", nameAr: "التخزين (SSD)", type: "select", unit: "GB" },
    { key: "screen_size", nameEn: "Screen Size", nameAr: "حجم الشاشة", type: "select", unit: "inch" },
    { key: "refresh_rate", nameEn: "Refresh Rate", nameAr: "معدل التحديث", type: "select", unit: "Hz" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
  computers: [
    { key: "cpu", nameEn: "CPU", nameAr: "المعالج", type: "select" },
    { key: "gpu", nameEn: "GPU", nameAr: "كرت الشاشة", type: "select" },
    { key: "ram", nameEn: "RAM", nameAr: "الذاكرة", type: "select", unit: "GB" },
    { key: "storage", nameEn: "Storage", nameAr: "التخزين", type: "select" },
    { key: "case_type", nameEn: "Case Type", nameAr: "نوع الصندوق", type: "select" },
    { key: "use_case", nameEn: "Use Case", nameAr: "الاستخدام", type: "select" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
  gaming: [
    { key: "platform", nameEn: "Platform", nameAr: "المنصة", type: "select" },
    { key: "cpu", nameEn: "CPU", nameAr: "المعالج", type: "select" },
    { key: "gpu", nameEn: "GPU", nameAr: "كرت الشاشة", type: "select" },
    { key: "ram", nameEn: "RAM", nameAr: "الذاكرة", type: "select", unit: "GB" },
    { key: "storage", nameEn: "Storage", nameAr: "التخزين", type: "select" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
  monitors: [
    { key: "size", nameEn: "Size", nameAr: "الحجم", type: "select", unit: "inch" },
    { key: "resolution", nameEn: "Resolution", nameAr: "الدقة", type: "select" },
    { key: "refresh_rate", nameEn: "Refresh Rate", nameAr: "معدل التحديث", type: "select", unit: "Hz" },
    { key: "panel_type", nameEn: "Panel Type", nameAr: "نوع اللوحة", type: "select" },
    { key: "ports", nameEn: "Ports", nameAr: "المنافذ", type: "select" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
  printers: [
    { key: "printer_type", nameEn: "Printer Type", nameAr: "نوع الطابعة", type: "select" },
    { key: "color_mode", nameEn: "Color / Mono", nameAr: "ملون / أبيض وأسود", type: "select" },
    { key: "function", nameEn: "Function", nameAr: "الوظيفة", type: "select" },
    { key: "connectivity", nameEn: "Connectivity", nameAr: "الاتصال", type: "select" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
  networking: [
    { key: "device_type", nameEn: "Device Type", nameAr: "نوع الجهاز", type: "select" },
    { key: "wifi_standard", nameEn: "WiFi Standard", nameAr: "معيار الواي فاي", type: "select" },
    { key: "speed", nameEn: "Speed", nameAr: "السرعة", type: "select" },
    { key: "ports", nameEn: "Ports", nameAr: "المنافذ", type: "select" },
    { key: "poe", nameEn: "PoE", nameAr: "PoE", type: "boolean" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
  "smart-home": [
    { key: "device_type", nameEn: "Device Type", nameAr: "نوع الجهاز", type: "select" },
    { key: "protocol", nameEn: "Protocol", nameAr: "البروتوكول", type: "select" },
    { key: "app_support", nameEn: "App Support", nameAr: "دعم التطبيق", type: "boolean" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
  accessories: [
    { key: "type", nameEn: "Type", nameAr: "النوع", type: "select" },
    { key: "compatibility", nameEn: "Compatibility", nameAr: "التوافق", type: "select" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
  components: [
    { key: "component_type", nameEn: "Component Type", nameAr: "نوع المكوّن", type: "select" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
  "power-solutions": [
    { key: "device_type", nameEn: "Device Type", nameAr: "نوع الجهاز", type: "select" },
    { key: "capacity", nameEn: "Capacity", nameAr: "السعة", type: "select" },
    { key: "brand", nameEn: "Brand", nameAr: "العلامة التجارية", type: "select" },
  ],
};

export function facetDefsForCategory(slug: string): FacetDef[] {
  return CATEGORY_FILTER_FACETS[slug] ?? [];
}

export function facetKeysForCategory(slug: string): Set<string> {
  return new Set(facetDefsForCategory(slug).map((f) => f.key));
}

export interface SplitResult {
  /** Buyer-useful, category-relevant filter values. */
  filterFacets: Record<string, string>;
  /** Full specs for the product card/detail page. */
  displaySpecs: Record<string, string>;
  /** Feed facet keys that are not relevant filters for this category. */
  irrelevantFacets: string[];
}

/**
 * Split raw specs + explicit feed facets into category-aware filter facets and
 * display specs. Explicit feed facets that are not relevant to the category are
 * demoted to display specs and reported (so we never show irrelevant filters).
 */
export function splitFacetsAndSpecs(
  categorySlug: string,
  rawSpecs: Record<string, string>,
  rawFacets: Record<string, string>,
): SplitResult {
  const allowed = facetKeysForCategory(categorySlug);
  const filterFacets: Record<string, string> = {};
  const displaySpecs: Record<string, string> = {};
  const irrelevantFacets: string[] = [];

  for (const [k, v] of Object.entries(rawFacets)) {
    const key = normalizeSpecName(k);
    const val = normalizeSpecValue(v);
    if (!key || !val) continue;
    if (allowed.size === 0 || allowed.has(key)) {
      filterFacets[key] = val;
    } else {
      irrelevantFacets.push(key);
      displaySpecs[key] = val; // keep as display, not a filter
    }
  }

  for (const [k, v] of Object.entries(rawSpecs)) {
    const key = normalizeSpecName(k);
    const val = normalizeSpecValue(v);
    if (!key || !val) continue;
    displaySpecs[key] = val;
    // Promote to a filter only when the key is an allowed facet for this category.
    if (allowed.has(key) && !(key in filterFacets)) filterFacets[key] = val;
  }

  return { filterFacets, displaySpecs, irrelevantFacets };
}
