/**
 * Human-readable report builders (Markdown) derived from an ImportPlan.
 * The JSON reports are just the plan / audit objects serialized by the scripts.
 */
import type { ImportPlan, PlannedProduct } from "./types";
import { marginOutOfRange } from "./pricing";
import { isUsableImage } from "./images";

function kvLines(rec: Record<string, number>, max = 20): string {
  const entries = Object.entries(rec).sort((a, b) => b[1] - a[1]).slice(0, max);
  if (entries.length === 0) return "_none_";
  return entries.map(([k, v]) => `- ${k}: ${v}`).join("\n");
}

export function formatPlanMarkdown(plan: ImportPlan): string {
  const s = plan.summary;
  const lines: string[] = [];
  lines.push(`# FreeZone Catalog Import — Dry-Run Summary`);
  lines.push("");
  lines.push(`> ${plan.note}`);
  lines.push(`> Source: \`${plan.source}\``);
  lines.push("");
  lines.push(`## Totals`);
  lines.push(`- Products in feed: **${s.total}**`);
  lines.push(`- Ready to publish: **${s.ready}**`);
  lines.push(`- Needs review (held as draft/pending): **${s.needsReview}**`);
  lines.push(`- With blocking errors: **${s.withErrors}**`);
  lines.push(`- Duplicate handles: **${s.duplicates.length}**`);
  lines.push("");
  lines.push(`## Quality flags`);
  lines.push(`- Missing base cost: ${s.missingCost}`);
  lines.push(`- Missing/unusable main image: ${s.missingMainImage}`);
  lines.push(`- Missing specs: ${s.missingSpecs}`);
  lines.push(`- Competitor images (need approval): ${s.competitorImages}`);
  lines.push(`- Margin outside 15–30%: ${s.marginOutOfRange}`);
  lines.push(`- Unknown category: ${s.unknownCategory}`);
  lines.push("");
  lines.push(`## By category`);
  lines.push(kvLines(s.byCategory));
  lines.push("");
  lines.push(`## By brand`);
  lines.push(kvLines(s.byBrand));
  lines.push("");
  lines.push(`## Review queue`);
  const review = plan.items.filter((i) => i.reviewRequired);
  if (review.length === 0) {
    lines.push("_no products require review_");
  } else {
    for (const it of review.slice(0, 100)) {
      lines.push(`- **${it.sku || it.sourceHandle}** (${it.categorySlug || "?"}): ${it.reviewReasons.join("; ") || "review flagged"}`);
    }
    if (review.length > 100) lines.push(`- …and ${review.length - 100} more`);
  }
  lines.push("");
  return lines.join("\n");
}

export interface CatalogAudit {
  note: string;
  source: string;
  totals: { products: number; ready: number; needsReview: number; withErrors: number };
  images: { missingMain: number; competitor: number; invalid: number; unsupported: number; galleryTotal: number };
  filters: {
    productsWithFacets: number;
    productsWithoutFacets: number;
    irrelevantFacetReports: number;
    coverageByCategory: Record<string, { total: number; withFacets: number }>;
  };
  pricing: {
    missingCost: number;
    missingPrice: number;
    marginOutOfRange: number;
    explicitPriced: number;
    markupPriced: number;
  };
  reviewQueue: { sku: string; category: string; reasons: string[] }[];
}

export function buildAudit(plan: ImportPlan): CatalogAudit {
  const items = plan.items;
  const coverage: Record<string, { total: number; withFacets: number }> = {};
  for (const it of items) {
    const c = (coverage[it.categorySlug] ??= { total: 0, withFacets: 0 });
    c.total++;
    if (Object.keys(it.filterFacets).length > 0) c.withFacets++;
  }
  const imgCount = (pred: (it: PlannedProduct) => boolean) => items.filter(pred).length;

  return {
    note: "DRY-RUN AUDIT — derived from the feed; no database queried/modified.",
    source: plan.source,
    totals: {
      products: items.length,
      ready: plan.summary.ready,
      needsReview: plan.summary.needsReview,
      withErrors: plan.summary.withErrors,
    },
    images: {
      missingMain: imgCount((i) => !isUsableImage(i.mainImage)),
      competitor: imgCount(
        (i) => i.mainImage?.verdict === "needs_approval_competitor" || i.galleryImages.some((g) => g.verdict === "needs_approval_competitor"),
      ),
      invalid: imgCount((i) => i.mainImage?.verdict === "invalid_url" || i.galleryImages.some((g) => g.verdict === "invalid_url")),
      unsupported: imgCount((i) => i.mainImage?.verdict === "unsupported_format" || i.galleryImages.some((g) => g.verdict === "unsupported_format")),
      galleryTotal: items.reduce((n, i) => n + i.galleryImages.length, 0),
    },
    filters: {
      productsWithFacets: items.filter((i) => Object.keys(i.filterFacets).length > 0).length,
      productsWithoutFacets: items.filter((i) => Object.keys(i.filterFacets).length === 0).length,
      irrelevantFacetReports: items.filter((i) => i.issues.some((x) => x.code === "IRRELEVANT_FACETS")).length,
      coverageByCategory: coverage,
    },
    pricing: {
      missingCost: items.filter((i) => i.pricing.costIqd == null).length,
      missingPrice: items.filter((i) => i.pricing.priceIqd == null).length,
      marginOutOfRange: items.filter((i) => marginOutOfRange(i.pricing.marginPercent)).length,
      explicitPriced: items.filter((i) => i.pricing.source === "explicit_price").length,
      markupPriced: items.filter((i) => i.pricing.source === "markup").length,
    },
    reviewQueue: items
      .filter((i) => i.reviewRequired)
      .map((i) => ({ sku: i.sku || i.sourceHandle, category: i.categorySlug, reasons: i.reviewReasons })),
  };
}

export function formatAuditMarkdown(audit: CatalogAudit): string {
  const lines: string[] = [];
  lines.push(`# FreeZone Catalog Quality Audit`);
  lines.push("");
  lines.push(`> ${audit.note}`);
  lines.push(`> Source: \`${audit.source}\``);
  lines.push("");
  lines.push(`## Totals`);
  lines.push(`- Products: ${audit.totals.products} | Ready: ${audit.totals.ready} | Needs review: ${audit.totals.needsReview} | Errors: ${audit.totals.withErrors}`);
  lines.push("");
  lines.push(`## Images`);
  lines.push(`- Missing main: ${audit.images.missingMain}`);
  lines.push(`- Competitor (need approval): ${audit.images.competitor}`);
  lines.push(`- Invalid URL: ${audit.images.invalid}`);
  lines.push(`- Unsupported format: ${audit.images.unsupported}`);
  lines.push(`- Gallery images total: ${audit.images.galleryTotal}`);
  lines.push("");
  lines.push(`## Filters / facets`);
  lines.push(`- With filter facets: ${audit.filters.productsWithFacets}`);
  lines.push(`- Without filter facets: ${audit.filters.productsWithoutFacets}`);
  lines.push(`- Products with irrelevant feed facets demoted: ${audit.filters.irrelevantFacetReports}`);
  lines.push(`- Coverage by category:`);
  for (const [cat, c] of Object.entries(audit.filters.coverageByCategory)) {
    lines.push(`  - ${cat}: ${c.withFacets}/${c.total} have facets`);
  }
  lines.push("");
  lines.push(`## Pricing`);
  lines.push(`- Missing base cost: ${audit.pricing.missingCost}`);
  lines.push(`- Missing computable price: ${audit.pricing.missingPrice}`);
  lines.push(`- Margin out of range (15–30%): ${audit.pricing.marginOutOfRange}`);
  lines.push(`- Explicit-priced: ${audit.pricing.explicitPriced} | Markup-priced: ${audit.pricing.markupPriced}`);
  lines.push("");
  lines.push(`## Review queue (${audit.reviewQueue.length})`);
  for (const r of audit.reviewQueue.slice(0, 100)) {
    lines.push(`- ${r.sku} (${r.category}): ${r.reasons.join("; ")}`);
  }
  lines.push("");
  return lines.join("\n");
}
