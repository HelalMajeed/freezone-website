import type { FacetAttributeDef } from "@/lib/data";
import { isLongMarketingFacetText, sanitizeFacetFilterToken } from "@/lib/classification/facet-filter-token";
import { buildSmartSpecRows } from "@/lib/classification/filter-display-link";

const SNAKE_KEY = /^[a-z][a-z0-9_]*$/;

export function validateAdminProductSpecs(
  attributes: FacetAttributeDef[],
  displaySpecs: Record<string, string>,
  filterSpecs: Record<string, string>,
  categorySlug?: string,
): string | null {
  const keys = attributes.map((a) => a.key);
  const dup = keys.find((k, i) => keys.indexOf(k) !== i);
  if (dup) return `مفتاح مكرر: ${dup}`;

  for (const attr of attributes) {
    if (!SNAKE_KEY.test(attr.key)) {
      return `مفتاح غير صالح (snake_case): ${attr.key}`;
    }
  }

  const rows = buildSmartSpecRows(attributes, categorySlug);

  for (const row of rows) {
    for (const attr of row.filterAttrs) {
      const filter = (filterSpecs[attr.key] ?? "").trim();

      if (attr.required && !filter) {
        return `قيمة فلتر مطلوبة: ${attr.name_ar || attr.name_en || attr.key}`;
      }

      if (filter) {
        const token = sanitizeFacetFilterToken(attr.key, filter);
        if (!token || isLongMarketingFacetText(filter)) {
          return "هذه قيمة فلتر ويجب أن تكون قصيرة. ضع النص الكامل في مواصفة المنتج.";
        }
      }

      if (attr.options?.length && filter && attr.filterable) {
        const parts =
          attr.type === "MULTI_SELECT"
            ? filter.split(",").map((s) => s.trim()).filter(Boolean)
            : [filter];
        for (const part of parts) {
          if (!attr.options.includes(part)) {
            return "هذه القيمة غير موجودة في خيارات فلتر القسم.";
          }
        }
      }
    }

    if (row.displaySpecKey && row.displaySpecRequired) {
      const display = (displaySpecs[row.displaySpecKey] ?? "").trim();
      const anyFilter = row.filterAttrs.some((a) => (filterSpecs[a.key] ?? "").trim());
      if (anyFilter && !display) {
        return `مواصفة العرض المرتبطة مطلوبة: ${row.titleAr || row.displaySpecKey}`;
      }
    }
  }

  for (const attr of attributes) {
    if (attr.filterable) continue;
    const display = (displaySpecs[attr.key] ?? "").trim();
    if (attr.required && !display) {
      return `حقل مطلوب: ${attr.name_ar || attr.name_en || attr.key}`;
    }
  }

  return null;
}

export type SmartSpecRowStatus = "ok" | "warn" | "error";

export function smartSpecRowStatus(
  row: ReturnType<typeof buildSmartSpecRows>[number],
  displaySpecs: Record<string, string>,
  filterSpecs: Record<string, string>,
): SmartSpecRowStatus {
  let hasError = false;
  let hasWarn = false;

  for (const attr of row.filterAttrs) {
    const filter = (filterSpecs[attr.key] ?? "").trim();
    if (attr.required && !filter) hasError = true;
    if (filter) {
      const token = sanitizeFacetFilterToken(attr.key, filter);
      if (!token || isLongMarketingFacetText(filter)) hasError = true;
      if (attr.options?.length && !attr.options.includes(filter)) hasError = true;
    }
  }

  if (row.displaySpecKey) {
    const display = (displaySpecs[row.displaySpecKey] ?? "").trim();
    const anyFilter = row.filterAttrs.some((a) => (filterSpecs[a.key] ?? "").trim());
    if (anyFilter && !display) hasWarn = true;
    if (row.displaySpecRequired && anyFilter && !display) hasError = true;
  }

  if (hasError) return "error";
  if (hasWarn) return "warn";
  const anyFilled =
    row.filterAttrs.some((a) => (filterSpecs[a.key] ?? "").trim()) ||
    (row.displaySpecKey ? (displaySpecs[row.displaySpecKey] ?? "").trim() : "");
  return anyFilled ? "ok" : "warn";
}
