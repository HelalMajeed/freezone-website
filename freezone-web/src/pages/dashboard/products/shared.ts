/**
 * Small helpers shared by the catalog (products/categories) dashboard pages.
 */
import { freezoneApiUrl } from "@/lib/api-internal";
import type { DashboardLang } from "@/lib/dashboard/i18n";
import type { ProductCatalogStatus } from "@/lib/dashboard/api";

export function formatIqd(amount: number, lang: DashboardLang): string {
  const locale = lang === "ar" ? "ar-IQ" : "en-IQ";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IQD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function resolveUploadUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

export const CATALOG_STATUSES: ProductCatalogStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "PUBLISHED",
  "ARCHIVED",
];

export const CATALOG_STATUS_TONE: Record<
  ProductCatalogStatus,
  "neutral" | "success" | "warning" | "info" | "danger"
> = {
  DRAFT: "neutral",
  PENDING_REVIEW: "warning",
  CHANGES_REQUESTED: "info",
  PUBLISHED: "success",
  ARCHIVED: "danger",
};

/** i18n catalog key for a catalog status chip. */
export function catalogStatusKey(status: ProductCatalogStatus) {
  return `products.status${status}` as const;
}

/**
 * Raw API error messages (e.g. specs validation) are human sentences, not
 * contract codes — surface them verbatim instead of the generic fallback.
 */
export function isRawApiMessage(code: string): boolean {
  return !/^[A-Z0-9_]+$/.test(code);
}
