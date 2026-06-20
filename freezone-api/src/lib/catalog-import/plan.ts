/**
 * The planning core: turn normalized feed rows into a safe, reviewable import
 * plan + a quality audit. No DB, no side effects — fully dry-run.
 */
import type {
  RawProductRow,
  PlannedProduct,
  ImportPlan,
  PlanSummary,
  ValidationIssue,
  CatalogStatus,
} from "./types";
import { normalizeBrand, normalizeCategory, isKnownCategory, inferCategoryFromTitle, slugify } from "./normalize";
import { computePricing, marginOutOfRange } from "./pricing";
import { splitFacetsAndSpecs } from "./facets";
import { validateImageUrl, isUsableImage } from "./images";

function planOne(row: RawProductRow): PlannedProduct {
  const issues: ValidationIssue[] = [];
  const reviewReasons: string[] = [];

  const titleEn = row.titleEn.trim();
  const titleAr = row.titleAr.trim();
  if (!titleEn && !titleAr) issues.push({ level: "error", code: "NO_TITLE", message: "row has no English or Arabic title" });
  if (!titleAr) reviewReasons.push("missing Arabic title");

  const brand = normalizeBrand(row.brand);

  let categorySlug = normalizeCategory(row.category);
  if (!categorySlug) {
    const inferred = inferCategoryFromTitle(titleEn || titleAr);
    if (inferred) {
      categorySlug = inferred;
      issues.push({ level: "info", code: "CATEGORY_INFERRED", field: "category", message: `category inferred as "${inferred}" from title` });
    }
  }
  const knownCategory = !!categorySlug && isKnownCategory(categorySlug);
  if (!categorySlug) {
    issues.push({ level: "error", code: "NO_CATEGORY", field: "category", message: "category missing and could not be inferred" });
  } else if (!knownCategory) {
    reviewReasons.push("unknown category");
    issues.push({ level: "warning", code: "UNKNOWN_CATEGORY", field: "category", message: `category "${categorySlug}" is not a known FreeZone category` });
  }

  const pricing = computePricing({
    categorySlug,
    baseCostIqd: row.baseCostIqd,
    priceIqd: row.priceIqd,
    markupPercent: row.markupPercent,
    oldPriceIqd: row.oldPriceIqd,
  });
  for (const note of pricing.notes) issues.push({ level: "info", code: "PRICING", field: "price", message: note });
  if (pricing.priceIqd == null) reviewReasons.push("price could not be computed (missing base cost / price)");
  if (marginOutOfRange(pricing.marginPercent)) reviewReasons.push("margin outside 15–30% range");

  const { filterFacets, displaySpecs, irrelevantFacets } = splitFacetsAndSpecs(categorySlug, row.specs, row.filterFacets);
  if (irrelevantFacets.length > 0) {
    issues.push({
      level: "warning",
      code: "IRRELEVANT_FACETS",
      message: `facet keys not relevant to "${categorySlug}" demoted to display specs: ${irrelevantFacets.join(", ")}`,
    });
  }
  if (Object.keys(displaySpecs).length === 0) reviewReasons.push("missing specs");

  const mainImage = row.mainImageUrl ? validateImageUrl(row.mainImageUrl) : null;
  const galleryImages = row.galleryImageUrls.map((u) => validateImageUrl(u));
  if (!isUsableImage(mainImage)) reviewReasons.push("missing or unusable main image");
  if (mainImage?.verdict === "needs_approval_competitor") {
    reviewReasons.push("main image from competitor host needs approval");
    issues.push({ level: "warning", code: "COMPETITOR_IMAGE", field: "main_image_url", message: `image host ${mainImage.host} requires usage approval` });
  }
  for (const g of galleryImages) {
    if (g.verdict === "needs_approval_competitor") {
      issues.push({ level: "warning", code: "COMPETITOR_IMAGE", field: "gallery_image_urls", message: `gallery image host ${g.host} requires usage approval` });
    } else if (g.verdict === "invalid_url" || g.verdict === "unsupported_format") {
      issues.push({ level: "warning", code: "BAD_IMAGE", field: "gallery_image_urls", message: `gallery image ${g.url} is ${g.verdict}` });
    }
  }

  const sku = row.sku.trim();
  if (!sku) issues.push({ level: "warning", code: "NO_SKU", field: "sku", message: "row has no SKU — handle derived from title" });
  const handleSeed = sku || slugify(titleEn || titleAr);
  const sourceHandle = `import:${slugify(handleSeed)}`;

  const reviewRequired =
    row.reviewRequired || reviewReasons.length > 0 || issues.some((i) => i.level === "error");

  let catalogStatus: CatalogStatus;
  let active: boolean;
  if (pricing.priceIqd == null || issues.some((i) => i.level === "error")) {
    catalogStatus = "DRAFT";
    active = false;
  } else if (reviewRequired) {
    catalogStatus = "PENDING_REVIEW";
    active = false; // never auto-activate incomplete products
  } else if (row.active) {
    catalogStatus = "PUBLISHED";
    active = true;
  } else {
    catalogStatus = "DRAFT";
    active = false;
  }

  return {
    rowNumber: row.rowNumber,
    sku,
    sourceHandle,
    titleEn,
    titleAr,
    brand,
    categorySlug,
    knownCategory,
    pricing,
    filterFacets,
    displaySpecs,
    mainImage,
    galleryImages,
    warranty: row.warranty.trim(),
    catalogStatus,
    active,
    reviewRequired,
    reviewReasons,
    issues,
  };
}

export function buildImportPlan(rows: RawProductRow[], source: string): ImportPlan {
  const items = rows.map(planOne);

  // Duplicate detection by sourceHandle.
  const seen = new Map<string, number>();
  const duplicates: string[] = [];
  for (const it of items) {
    const n = (seen.get(it.sourceHandle) ?? 0) + 1;
    seen.set(it.sourceHandle, n);
    if (n === 2) duplicates.push(it.sourceHandle);
  }
  for (const it of items) {
    if ((seen.get(it.sourceHandle) ?? 0) > 1) {
      it.issues.push({ level: "warning", code: "DUPLICATE", field: "sku", message: `duplicate sourceHandle ${it.sourceHandle} in feed` });
    }
  }

  const summary: PlanSummary = {
    total: items.length,
    ready: items.filter((i) => i.catalogStatus === "PUBLISHED").length,
    needsReview: items.filter((i) => i.catalogStatus === "PENDING_REVIEW").length,
    withErrors: items.filter((i) => i.issues.some((x) => x.level === "error")).length,
    byCategory: count(items, (i) => i.categorySlug || "(none)"),
    byBrand: count(items, (i) => i.brand || "(none)"),
    missingCost: items.filter((i) => i.pricing.costIqd == null).length,
    missingMainImage: items.filter((i) => !isUsableImage(i.mainImage)).length,
    missingSpecs: items.filter((i) => Object.keys(i.displaySpecs).length === 0).length,
    competitorImages: items.filter(
      (i) => i.mainImage?.verdict === "needs_approval_competitor" || i.galleryImages.some((g) => g.verdict === "needs_approval_competitor"),
    ).length,
    marginOutOfRange: items.filter((i) => marginOutOfRange(i.pricing.marginPercent)).length,
    unknownCategory: items.filter((i) => !i.knownCategory).length,
    duplicates,
  };

  return {
    note: "DRY-RUN PLAN — no database was modified. Review before --apply.",
    source,
    summary,
    items,
  };
}

function count<T>(arr: T[], keyFn: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of arr) {
    const k = keyFn(x);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
