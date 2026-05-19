import type { FacetAttributeDef } from "@/lib/data";
import type { CategoryAttributeRow, ProductAttributeValueRow } from "./types";
import { categoryAttributeRowsToFacetDefs } from "./sync";
import { attributeValueToPdpDisplayString, normalizeAttributeType } from "./values";

export type ProductDetailSpecItem = {
  key: string;
  label: string;
  value: string;
  displayGroup: string;
};

export type ProductDetailSpecGroup = {
  group: string;
  groupLabel: { en: string; ar: string };
  items: ProductDetailSpecItem[];
};

/** Hide short filter-only rows when a rich display sibling exists on PDP. */
const HIDE_FILTER_IF_SIBLING_HAS_VALUE: Record<string, string[]> = {
  processor_family: ["processor_full", "processor"],
  processor_brand: ["processor_full", "processor"],
  processor_model: ["processor_full", "processor"],
  ram_size: ["ram_display", "ram"],
  ram_type: ["ram_display", "ram"],
  storage_size: ["storage_display", "storage"],
  storage_type: ["storage_display", "storage"],
  gpu_model: ["gpu_full", "gpu"],
  gpu_brand: ["gpu_full", "gpu"],
};

const GROUP_LABELS: Record<string, { en: string; ar: string }> = {
  general: { en: "General", ar: "عام" },
  identity: { en: "General", ar: "عام" },
  performance: { en: "Performance", ar: "الأداء" },
  memory_storage: { en: "Memory & Storage", ar: "الذاكرة والتخزين" },
  storage: { en: "Memory & Storage", ar: "الذاكرة والتخزين" },
  graphics: { en: "Graphics", ar: "الرسوميات" },
  display: { en: "Display", ar: "الشاشة" },
  connectivity: { en: "Connectivity", ar: "الاتصال" },
  battery: { en: "Battery", ar: "البطارية" },
  design: { en: "Design", ar: "التصميم" },
  warranty: { en: "Warranty", ar: "الضمان" },
  camera: { en: "Camera", ar: "الكاميرا" },
  variants: { en: "Variants", ar: "الخيارات" },
  specs: { en: "Other", ar: "أخرى" },
  other: { en: "Other", ar: "أخرى" },
};

export const PDP_DISPLAY_GROUP_ORDER = [
  "general",
  "identity",
  "performance",
  "memory_storage",
  "storage",
  "graphics",
  "display",
  "connectivity",
  "battery",
  "design",
  "warranty",
  "camera",
  "variants",
  "specs",
  "other",
] as const;

function normalizeGroupKey(raw: string | undefined): string {
  const g = (raw ?? "").trim().toLowerCase() || "other";
  if (g === "identity") return "general";
  return g;
}

function groupSortIndex(group: string): number {
  const i = PDP_DISPLAY_GROUP_ORDER.indexOf(group as (typeof PDP_DISPLAY_GROUP_ORDER)[number]);
  return i === -1 ? PDP_DISPLAY_GROUP_ORDER.length : i;
}

export function productAttributeValuesToPdpDisplaySpecs(
  values: ProductAttributeValueRow[],
  schema: CategoryAttributeRow[],
): Record<string, string> {
  const attrByKey = new Map(schema.map((a) => [a.key, a]));
  const out: Record<string, string> = {};
  for (const v of values) {
    const attr = attrByKey.get(v.attributeKey);
    if (!attr) continue;
    const type = normalizeAttributeType(attr.type);
    const display = attributeValueToPdpDisplayString(v, type, attr);
    if (display) out[v.attributeKey] = display;
  }
  return out;
}

export function mergePdpDisplaySpecs(
  fromEav: Record<string, string>,
  legacySpecs: unknown,
  schema: CategoryAttributeRow[],
): Record<string, string> {
  const legacy =
    legacySpecs && typeof legacySpecs === "object" && !Array.isArray(legacySpecs)
      ? (legacySpecs as Record<string, string>)
      : {};
  const schemaKeys = new Set(schema.map((a) => a.key));
  const out: Record<string, string> = {};

  for (const attr of schema) {
    const eav = fromEav[attr.key]?.trim();
    const leg = legacy[attr.key] != null ? String(legacy[attr.key]).trim() : "";
    if (eav) {
      out[attr.key] = eav;
    } else if (leg && !attr.filterable) {
      out[attr.key] = leg;
    } else if (leg && leg.length > 48) {
      out[attr.key] = leg;
    }
  }

  for (const [k, v] of Object.entries(legacy)) {
    if (!schemaKeys.has(k)) {
      const t = String(v).trim();
      if (t) out[k] = t;
    }
  }

  return out;
}

function shouldHideOnPdp(key: string, specs: Record<string, string>): boolean {
  const siblings = HIDE_FILTER_IF_SIBLING_HAS_VALUE[key];
  if (!siblings?.length) return false;
  return siblings.some((s) => Boolean(specs[s]?.trim()));
}

export function buildProductDetailSpecItems(
  schema: CategoryAttributeRow[],
  displaySpecs: Record<string, string>,
  locale: "en" | "ar",
): ProductDetailSpecItem[] {
  const rows: ProductDetailSpecItem[] = [];
  const sorted = [...schema]
    .filter((a) => a.active !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const attr of sorted) {
    if (shouldHideOnPdp(attr.key, displaySpecs)) continue;
    const value = displaySpecs[attr.key]?.trim();
    if (!value) continue;
    const label = (locale === "ar" ? attr.nameAr : attr.nameEn).trim() || attr.key;
    rows.push({
      key: attr.key,
      label,
      value,
      displayGroup: normalizeGroupKey(attr.displayGroup),
    });
  }

  const known = new Set(sorted.map((a) => a.key));
  for (const [key, raw] of Object.entries(displaySpecs)) {
    if (known.has(key) || shouldHideOnPdp(key, displaySpecs)) continue;
    const value = raw?.trim();
    if (!value) continue;
    rows.push({
      key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      displayGroup: "other",
    });
  }

  return rows;
}

export function groupProductDetailSpecItems(
  items: ProductDetailSpecItem[],
  locale: "en" | "ar",
): ProductDetailSpecGroup[] {
  const buckets = new Map<string, ProductDetailSpecItem[]>();
  for (const item of items) {
    const g = normalizeGroupKey(item.displayGroup);
    if (!buckets.has(g)) buckets.set(g, []);
    buckets.get(g)!.push(item);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => groupSortIndex(a) - groupSortIndex(b))
    .map(([group, groupItems]) => {
      const labels = GROUP_LABELS[group] ?? GROUP_LABELS.other;
      return {
        group,
        groupLabel: labels,
        items: groupItems,
      };
    })
    .filter((g) => g.items.length > 0);
}

export function buildProductDetailSpecPresentation(
  schema: CategoryAttributeRow[],
  attributeValues: ProductAttributeValueRow[] | undefined,
  legacySpecs: unknown,
  locale: "en" | "ar",
): {
  specs: Record<string, string>;
  specItems: ProductDetailSpecItem[];
  groupedSpecs: ProductDetailSpecGroup[];
  attributes: FacetAttributeDef[];
} {
  const activeSchema = schema.filter((r) => r.active !== false);
  const fromEav =
    attributeValues?.length && activeSchema.length
      ? productAttributeValuesToPdpDisplaySpecs(attributeValues, activeSchema)
      : {};
  const specs = mergePdpDisplaySpecs(fromEav, legacySpecs, activeSchema);
  const specItems = buildProductDetailSpecItems(activeSchema, specs, locale);
  const groupedSpecs = groupProductDetailSpecItems(specItems, locale);
  const attributes = categoryAttributeRowsToFacetDefs(activeSchema);

  return { specs, specItems, groupedSpecs, attributes };
}

export function displayGroupTitle(group: string, locale: "en" | "ar"): string {
  const g = normalizeGroupKey(group);
  const hit = GROUP_LABELS[g] ?? GROUP_LABELS.other;
  return locale === "ar" ? hit.ar : hit.en;
}
