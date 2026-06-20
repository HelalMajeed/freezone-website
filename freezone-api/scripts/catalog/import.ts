/**
 * FreeZone catalog importer (CLI).
 *
 *   tsx scripts/catalog/import.ts --source data/import/samples/example-products.csv --dry-run
 *   tsx scripts/catalog/import.ts --source <feed> --apply --confirm
 *
 * Dry-run (default) is 100% safe: it parses + normalizes + prices + builds
 * category-aware facets/display-specs + validates images and writes reports.
 * It NEVER touches the database. --apply performs idempotent upserts (by
 * sourceHandle) and is heavily guarded — see runApply().
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadFeedRecords, mapRecordToRaw } from "../../src/lib/catalog-import/feed";
import { buildImportPlan } from "../../src/lib/catalog-import/plan";
import { formatPlanMarkdown } from "../../src/lib/catalog-import/report";
import type { ImportPlan, PlannedProduct } from "../../src/lib/catalog-import/types";

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function main(): void {
  const source = getArg("--source");
  const apply = hasFlag("--apply");
  const outDir = getArg("--out") ?? "reports";

  if (!source) {
    console.error("Usage: tsx scripts/catalog/import.ts --source <feed.csv|feed.json> [--dry-run|--apply --confirm] [--out reports]");
    process.exit(1);
  }

  const text = readFileSync(resolve(source), "utf8");
  const records = loadFeedRecords(source, text);
  const rows = records.map((r, i) => mapRecordToRaw(r, i + 1));
  const plan = buildImportPlan(rows, source);

  mkdirSync(resolve(outDir), { recursive: true });
  writeFileSync(resolve(outDir, "catalog-import-dry-run.json"), JSON.stringify(plan, null, 2), "utf8");
  writeFileSync(resolve(outDir, "catalog-import-summary.md"), formatPlanMarkdown(plan), "utf8");

  const s = plan.summary;
  console.log(`\nFreeZone catalog import — DRY RUN`);
  console.log(`  source:        ${plan.source}`);
  console.log(`  products:      ${s.total}`);
  console.log(`  ready:         ${s.ready}`);
  console.log(`  needs review:  ${s.needsReview}`);
  console.log(`  with errors:   ${s.withErrors}`);
  console.log(`  missing cost:  ${s.missingCost} | missing image: ${s.missingMainImage} | competitor imgs: ${s.competitorImages}`);
  console.log(`  reports:       ${resolve(outDir, "catalog-import-summary.md")}`);

  if (!apply) {
    console.log(`\n(dry-run only — re-run with --apply --confirm to write to the database)\n`);
    return;
  }
  void runApply(plan);
}

/**
 * Guarded apply. Idempotent upsert by sourceHandle; never auto-activates
 * incomplete products; refuses in production without an explicit ack.
 */
async function runApply(plan: ImportPlan): Promise<void> {
  if (!hasFlag("--confirm")) {
    console.error("\n[apply] refused: pass --confirm to write to the database (dry-run report is above).");
    process.exit(2);
  }
  if (!process.env.DATABASE_URL) {
    console.error("[apply] refused: DATABASE_URL is not set.");
    process.exit(2);
  }
  if (process.env.NODE_ENV === "production" && !hasFlag("--confirm-production")) {
    console.error("[apply] refused: NODE_ENV=production requires --confirm-production (and an approved feed).");
    process.exit(2);
  }
  if (plan.summary.withErrors > 0) {
    console.error(`[apply] refused: ${plan.summary.withErrors} rows have blocking errors. Fix the feed and re-run dry-run.`);
    process.exit(2);
  }

  const { prisma } = await import("../../src/lib/prisma");
  const applicable = plan.items.filter((i) => i.pricing.priceIqd != null && !i.issues.some((x) => x.level === "error"));
  let upserted = 0;
  let skipped = 0;
  const skippedReasons: { sku: string; reason: string }[] = [];

  for (const it of applicable) {
    const category = await prisma.category.findUnique({ where: { slug: it.categorySlug } });
    if (!category) {
      skipped++;
      skippedReasons.push({ sku: it.sku || it.sourceHandle, reason: `category slug "${it.categorySlug}" not found` });
      continue;
    }
    let brandId: number | null = null;
    if (it.brand) {
      const brand = await prisma.brand.upsert({
        where: { slug: slugifyBrand(it.brand) },
        update: {},
        create: { slug: slugifyBrand(it.brand), nameEn: it.brand, nameAr: it.brand },
      });
      brandId = brand.id;
    }

    const specsJson = { ...it.displaySpecs, ...it.filterFacets };
    const nameEn = it.titleEn || it.titleAr;
    const nameAr = it.titleAr || it.titleEn;
    const publish = it.catalogStatus === "PUBLISHED";

    const base = {
      categoryId: category.id,
      brand: it.brand,
      brandId,
      sku: it.sku,
      nameEn,
      nameAr,
      shortDescEn: "",
      shortDescAr: "",
      price: it.pricing.priceIqd as number,
      costPrice: it.pricing.costIqd ?? undefined,
      originalPrice: it.pricing.costIqd ?? undefined,
      oldPrice: it.pricing.oldPriceIqd ?? undefined,
      warranty: it.warranty,
      sourceUrl: undefined as string | undefined,
      specs: specsJson,
      catalogStatus: it.catalogStatus,
      published: publish,
      inStock: publish,
    };

    await prisma.product.upsert({
      where: { sourceHandle: it.sourceHandle },
      update: base,
      create: { ...base, sourceHandle: it.sourceHandle, importedAt: new Date() },
    });
    upserted++;
  }

  const report = { note: "APPLY RESULT", upserted, skipped, skippedReasons };
  mkdirSync(resolve("reports"), { recursive: true });
  writeFileSync(resolve("reports", "catalog-import-apply.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(`\n[apply] upserted=${upserted} skipped=${skipped}. Run \`npm run classification:repair\` to sync EAV filter facets.`);
  await prisma.$disconnect();
}

function slugifyBrand(s: string): string {
  return s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

main();
