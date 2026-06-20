/**
 * Catalog import / audit pipeline — shared types.
 *
 * Pure, dependency-free, Prisma-free domain types so the whole pipeline can be
 * unit-tested and dry-run without a database. The Prisma "apply" step lives in
 * scripts/catalog/import.ts and consumes these planned objects.
 */

export type IssueLevel = "error" | "warning" | "info";

export interface ValidationIssue {
  level: IssueLevel;
  code: string;
  field?: string;
  message: string;
}

/** One normalized row from a supplier feed (CSV/JSON) before planning. */
export interface RawProductRow {
  rowNumber: number;
  sku: string;
  titleEn: string;
  titleAr: string;
  brand: string;
  category: string;
  subcategory: string;
  baseCostIqd: number | null;
  priceIqd: number | null;
  markupPercent: number | null;
  oldPriceIqd: number | null;
  stockStatus: string;
  mainImageUrl: string;
  galleryImageUrls: string[];
  sourceUrl: string;
  warranty: string;
  shortDescEn: string;
  shortDescAr: string;
  specs: Record<string, string>;
  filterFacets: Record<string, string>;
  active: boolean;
  reviewRequired: boolean;
}

export type PricingSource = "explicit_price" | "markup" | "none";

export interface PricingResult {
  costIqd: number | null;
  markupPercent: number | null;
  priceIqd: number | null;
  oldPriceIqd: number | null;
  marginPercent: number | null;
  source: PricingSource;
  notes: string[];
}

export type CatalogStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED";

export interface ImageCheck {
  url: string;
  verdict:
    | "ok"
    | "same_origin_upload"
    | "needs_approval_competitor"
    | "invalid_url"
    | "unsupported_format"
    | "empty";
  host: string | null;
}

export interface PlannedProduct {
  rowNumber: number;
  sku: string;
  sourceHandle: string;
  titleEn: string;
  titleAr: string;
  brand: string;
  categorySlug: string;
  knownCategory: boolean;
  pricing: PricingResult;
  filterFacets: Record<string, string>;
  displaySpecs: Record<string, string>;
  mainImage: ImageCheck | null;
  galleryImages: ImageCheck[];
  warranty: string;
  catalogStatus: CatalogStatus;
  active: boolean;
  reviewRequired: boolean;
  reviewReasons: string[];
  issues: ValidationIssue[];
}

export interface PlanSummary {
  total: number;
  ready: number;
  needsReview: number;
  withErrors: number;
  byCategory: Record<string, number>;
  byBrand: Record<string, number>;
  missingCost: number;
  missingMainImage: number;
  missingSpecs: number;
  competitorImages: number;
  marginOutOfRange: number;
  unknownCategory: number;
  duplicates: string[];
}

export interface ImportPlan {
  note: string;
  source: string;
  summary: PlanSummary;
  items: PlannedProduct[];
}
