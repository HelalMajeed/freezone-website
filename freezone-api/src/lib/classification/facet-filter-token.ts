import { facetValueForFilter } from "./legacy-spec-map";
import { normalizeFilterValue } from "./filter-value";
import { sanitizeStoredScreenSize } from "./laptop-filter-extract";

/** Max length for a filter facet label in sidebar / URL. */
export const MAX_FACET_FILTER_TOKEN_LEN = 48;

const LONG_TEXT_MARKERS =
  /®|™|Processor|Laptop GPU|Cores|Threads|up to \d|GeForce|Intel®|NVIDIA®|DDR\d|NVMe/i;

/** Reject marketing display strings — only allow short normalized filter tokens. */
export function isLongMarketingFacetText(value: string): boolean {
  const s = value.trim();
  if (s.length > MAX_FACET_FILTER_TOKEN_LEN) return true;
  if (LONG_TEXT_MARKERS.test(s)) return true;
  if (s.split(/\s+/).length > 5) return true;
  return false;
}

/**
 * Normalize raw stored filter token for sidebar + URL.
 * Returns undefined if value is missing or looks like PDP display text.
 */
export function sanitizeFacetFilterToken(attributeKey: string, raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const trimmed = raw.trim();

  const normalized =
    facetValueForFilter(attributeKey, trimmed) ?? normalizeFilterValue(attributeKey, trimmed);

  const key = attributeKey.toLowerCase();
  if (key === "screen_size" || key === "size_inch") {
    const inch = sanitizeStoredScreenSize(normalized ?? trimmed);
    return inch;
  }

  if (normalized && !isLongMarketingFacetText(normalized)) {
    return normalized;
  }

  if (!isLongMarketingFacetText(trimmed) && trimmed.length <= MAX_FACET_FILTER_TOKEN_LEN) {
    return trimmed;
  }

  return undefined;
}

/** Filter facet value for a product — ONLY from `filterValues`, never display specs. */
export function getProductFilterToken(
  product: { filterValues?: Record<string, string> },
  attributeKey: string,
): string | undefined {
  const raw = product.filterValues?.[attributeKey];
  return sanitizeFacetFilterToken(attributeKey, raw);
}

export function formatFacetFilterLabel(
  attributeKey: string,
  token: string,
  unit?: string,
  locale: "en" | "ar" = "en",
): string {
  const key = attributeKey.toLowerCase();
  const t = token.trim();
  if (!t) return "";

  if (key === "ram_size" || key === "ram") {
    return /gb/i.test(t) ? t : `${t} GB`;
  }
  if (key === "storage_size" || key === "storage") {
    const n = parseFloat(t);
    if (Number.isFinite(n) && n >= 1024) {
      const tb = n / 1024;
      return locale === "ar" ? `${tb} تيرابايت` : `${tb} TB`;
    }
    return /gb|tb/i.test(t) ? t : `${t} GB`;
  }
  if (key === "screen_size" || key === "size_inch") {
    return /inch|"/i.test(t) ? t : `${t} inch`;
  }
  if (unit && /^\d+(\.\d+)?$/.test(t)) {
    return `${t} ${unit}`;
  }
  return t;
}
