import type { FacetAttributeDef } from "@/lib/data";
import type { ProductSpecAttributeRow } from "@/lib/productSpecCardChips";

export const SPEC_DISPLAY_GROUP_ORDER = [
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

export function displayGroupSortIndex(group: string): number {
  const i = SPEC_DISPLAY_GROUP_ORDER.indexOf(group as (typeof SPEC_DISPLAY_GROUP_ORDER)[number]);
  return i === -1 ? SPEC_DISPLAY_GROUP_ORDER.length : i;
}

export function formatSpecValueForDisplay(
  raw: string,
  attr: FacetAttributeDef | undefined,
  locale: "en" | "ar",
): string {
  const val = raw.trim();
  if (!val) return "";
  const type = attr?.type ?? "SELECT";

  if (type === "BOOLEAN") {
    const v = val.toLowerCase();
    const yes = locale === "ar" ? "نعم" : "Yes";
    const no = locale === "ar" ? "لا" : "No";
    if (v === "true" || v === "1" || v === "yes" || v === "نعم") return yes;
    if (v === "false" || v === "0" || v === "no" || v === "لا") return no;
    return val;
  }

  if (type === "MULTI_SELECT") {
    return val
      .split(/[,;|]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .join(locale === "ar" ? "، " : ", ");
  }

  if (attr?.unit && type === "RANGE") {
    const n = parseFloat(val.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return `${n} ${attr.unit}`;
  }

  if (attr?.unit && /^\d+(\.\d+)?$/.test(val)) {
    return `${val} ${attr.unit}`;
  }

  return val;
}

export function groupSpecRowsByDisplayGroup(
  rows: ProductSpecAttributeRow[],
  facetAttributes: FacetAttributeDef[] | undefined,
): { group: string; rows: ProductSpecAttributeRow[] }[] {
  const attrByKey = new Map((facetAttributes ?? []).map((a) => [a.key, a]));
  const buckets = new Map<string, ProductSpecAttributeRow[]>();

  for (const row of rows) {
    const group = attrByKey.get(row.specKey)?.displayGroup?.trim() || "specs";
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group)!.push(row);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => displayGroupSortIndex(a) - displayGroupSortIndex(b))
    .map(([group, groupRows]) => ({ group, rows: groupRows }));
}

export function humanizeDisplayGroup(group: string, locale: "en" | "ar"): string {
  const labels: Record<string, { en: string; ar: string }> = {
    general: { en: "General", ar: "عام" },
    identity: { en: "General", ar: "عام" },
    performance: { en: "Performance", ar: "الأداء" },
    memory_storage: { en: "Memory & Storage", ar: "الذاكرة والتخزين" },
    storage: { en: "Memory & Storage", ar: "الذاكرة والتخزين" },
    graphics: { en: "Graphics", ar: "الرسوميات" },
    display: { en: "Display", ar: "الشاشة" },
    camera: { en: "Camera", ar: "الكاميرا" },
    battery: { en: "Battery", ar: "البطارية" },
    connectivity: { en: "Connectivity", ar: "الاتصال" },
    design: { en: "Design", ar: "التصميم" },
    variants: { en: "Variants", ar: "الخيارات" },
    warranty: { en: "Warranty", ar: "الضمان" },
    specs: { en: "Other", ar: "أخرى" },
    other: { en: "Other", ar: "أخرى" },
  };
  const hit = labels[group];
  if (hit) return locale === "ar" ? hit.ar : hit.en;
  return group.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
