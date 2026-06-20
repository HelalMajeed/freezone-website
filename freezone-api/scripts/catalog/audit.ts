/**
 * FreeZone catalog quality audit (CLI) — feed-based, read-only, no DB.
 *
 *   tsx scripts/catalog/audit.ts --source <feed>            (full audit)
 *   tsx scripts/catalog/audit.ts --source <feed> --only=images|filters|pricing
 *
 * Writes reports/catalog-quality-audit.json + .md
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadFeedRecords, mapRecordToRaw } from "../../src/lib/catalog-import/feed";
import { buildImportPlan } from "../../src/lib/catalog-import/plan";
import { buildAudit, formatAuditMarkdown } from "../../src/lib/catalog-import/report";

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0) return process.argv[i + 1];
  const inline = process.argv.find((a) => a.startsWith(name + "="));
  return inline ? inline.slice(name.length + 1) : undefined;
}

function main(): void {
  const source = getArg("--source");
  const only = getArg("--only");
  const outDir = getArg("--out") ?? "reports";
  if (!source) {
    console.error("Usage: tsx scripts/catalog/audit.ts --source <feed.csv|feed.json> [--only=images|filters|pricing]");
    process.exit(1);
  }

  const text = readFileSync(resolve(source), "utf8");
  const records = loadFeedRecords(source, text);
  const rows = records.map((r, i) => mapRecordToRaw(r, i + 1));
  const plan = buildImportPlan(rows, source);
  const audit = buildAudit(plan);

  mkdirSync(resolve(outDir), { recursive: true });
  writeFileSync(resolve(outDir, "catalog-quality-audit.json"), JSON.stringify(audit, null, 2), "utf8");
  writeFileSync(resolve(outDir, "catalog-quality-audit.md"), formatAuditMarkdown(audit), "utf8");

  console.log(`\nFreeZone catalog audit (${only ?? "all"}) — source ${audit.source}`);
  if (!only || only === "pricing") {
    console.log(`  pricing: missingCost=${audit.pricing.missingCost} missingPrice=${audit.pricing.missingPrice} marginOOR=${audit.pricing.marginOutOfRange} explicit=${audit.pricing.explicitPriced} markup=${audit.pricing.markupPriced}`);
  }
  if (!only || only === "images") {
    console.log(`  images:  missingMain=${audit.images.missingMain} competitor=${audit.images.competitor} invalid=${audit.images.invalid} unsupported=${audit.images.unsupported}`);
  }
  if (!only || only === "filters") {
    console.log(`  filters: withFacets=${audit.filters.productsWithFacets} withoutFacets=${audit.filters.productsWithoutFacets} irrelevantDemoted=${audit.filters.irrelevantFacetReports}`);
  }
  console.log(`  review queue: ${audit.reviewQueue.length}`);
  console.log(`  reports: ${resolve(outDir, "catalog-quality-audit.md")}\n`);
}

main();
