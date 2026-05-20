import type { FacetAttributeDef } from "@/lib/data";
import { isLongMarketingFacetText, sanitizeFacetFilterToken } from "@/lib/classification/facet-filter-token";

const SNAKE_KEY = /^[a-z][a-z0-9_]*$/;

export function validateAdminProductSpecs(
  attributes: FacetAttributeDef[],
  displaySpecs: Record<string, string>,
  filterSpecs: Record<string, string>,
): string | null {
  const keys = attributes.map((a) => a.key);
  const dup = keys.find((k, i) => keys.indexOf(k) !== i);
  if (dup) return `مفتاح مكرر: ${dup}`;

  for (const attr of attributes) {
    if (!SNAKE_KEY.test(attr.key)) {
      return `مفتاح غير صالح (snake_case): ${attr.key}`;
    }
    const display = (displaySpecs[attr.key] ?? "").trim();
    const filter = (filterSpecs[attr.key] ?? "").trim();

    if (attr.required && !display && !filter) {
      return `حقل مطلوب: ${attr.name_ar || attr.name_en || attr.key}`;
    }

    if (attr.filterable && filter) {
      const token = sanitizeFacetFilterToken(attr.key, filter);
      if (!token || isLongMarketingFacetText(filter)) {
        return `قيمة الفلتر غير صالحة لـ ${attr.name_ar || attr.name_en || attr.key}: ضع النص الكامل في Display Specs وليس Filter Values (مثال: Core i7، RTX 5070)`;
      }
    }

    if (attr.filterable && display && !filter) {
      const long = display.length > 48;
      if (long) {
        return `أدخل قيمة فلتر مختصرة لـ ${attr.name_ar || attr.key} (لا تستخدم النص الطويل في الفلتر)`;
      }
    }

    if (attr.type === "SELECT" && attr.options?.length && filter && attr.filterable) {
      if (!attr.options.includes(filter)) {
        return `قيمة الفلتر غير مسموحة لـ ${attr.key}: ${filter}`;
      }
    }
  }

  return null;
}
