#!/usr/bin/env node
// Strict read-only verifier for an ImportBatch.
//
//   Loads every product written by `import-sample.mjs --live` for the batch and
//   walks a checklist that mirrors the user-facing import contract: warranty
//   present, price = sourcePrice × 1.35, all images mirrored locally, every
//   scraped variant materialised in the DB, etc.
//
//   Exit code is 0 only when every product passes every check. Otherwise the
//   script prints a per-failure summary and exits with code 1.
//
// Usage:
//   DATABASE_URL=... node scripts/import-globaliraq/verify.mjs --batch=<id>
//   DATABASE_URL=... node scripts/import-globaliraq/verify.mjs --latest
//   DATABASE_URL=... node scripts/import-globaliraq/verify.mjs --latest --markup=1.35

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(import.meta.dirname, "data");
const MAPPED_DIR = resolve(DATA_DIR, "mapped");
const EXPECTED_WARRANTY = "ضمان سنتين وكالة";
/** Anything matching this regex in a final ProductImage.url is a hard fail. */
const FORBIDDEN_HOST_PATTERNS = [/shopify/i, /cdn\.shopify/i, /globaliraq\.iq/i];

function parseArgs(argv) {
  const out = { batch: null, latest: false, markup: 1.35, priceTolerance: 2 };
  for (const a of argv) {
    if (a === "--latest") { out.latest = true; continue; }
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (!m) continue;
    if (m[1] === "markup") out.markup = Number.parseFloat(m[2]) || out.markup;
    else if (m[1] === "price-tolerance") out.priceTolerance = Math.max(0, Number.parseInt(m[2], 10) || 0);
    else out[m[1]] = m[2];
  }
  if (!out.batch && !out.latest) {
    console.error("Usage: verify.mjs --batch=<id> | --latest");
    process.exit(2);
  }
  return out;
}

function loadMappedByHandle() {
  if (!existsSync(MAPPED_DIR)) return {};
  const files = readdirSync(MAPPED_DIR).filter((f) => f.endsWith(".json"));
  const out = {};
  for (const f of files) {
    const slug = f.replace(/\.json$/, "");
    out[slug] = JSON.parse(readFileSync(resolve(MAPPED_DIR, f), "utf8"));
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required (point at the same DB the importer wrote to).");
    process.exit(2);
  }
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const batch = args.latest
      ? await prisma.importBatch.findFirst({ orderBy: { startedAt: "desc" } })
      : await prisma.importBatch.findUnique({ where: { id: args.batch } });
    if (!batch) {
      console.error("No matching ImportBatch row.");
      process.exit(1);
    }

    console.log(`[verify] batch ${batch.id} status=${batch.status} source=${batch.source}`);
    console.log(`[verify] started=${batch.startedAt.toISOString()} finished=${batch.finishedAt?.toISOString() ?? "—"}`);
    console.log(`[verify] total=${batch.total} ok=${batch.succeeded} failed=${batch.failed}`);
    console.log("");

    const products = await prisma.product.findMany({
      where: { importBatchId: batch.id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { sortOrder: "asc" } },
        attributeValues: true,
        brandRef: { select: { id: true, nameEn: true } },
        category: { select: { id: true, slug: true } },
      },
    });

    if (products.length === 0) {
      console.log("[verify] no products in this batch.");
      process.exit(batch.status === "completed" ? 1 : 0);
    }

    const mappedByHandle = loadMappedByHandle();

    /** Each product is run through this list of checks; each entry returns null/"" on pass, a string on fail. */
    let totalIssues = 0;
    const failedProducts = [];
    for (const p of products) {
      const issues = [];
      const handle = p.sourceHandle || "";
      /** map keys use sanitised slugs — match the same transform scrape-product.mjs uses to write files. */
      const safeKey = handle.replace(/[^A-Za-z0-9._-]+/g, "_");
      const mapped = mappedByHandle[safeKey] || null;

      if (!p.sourceHandle) issues.push("sourceHandle missing");
      if (!p.sourceUrl) issues.push("sourceUrl missing");
      if (!p.importBatchId) issues.push("importBatchId missing");
      if (!p.importedAt) issues.push("importedAt missing");

      if (!p.warranty) issues.push("warranty missing");
      else if (p.warranty !== EXPECTED_WARRANTY) issues.push(`warranty mismatch: got "${p.warranty}"`);

      if (typeof p.sourcePrice !== "number") {
        issues.push("sourcePrice missing");
      } else {
        const expected = Math.round(p.sourcePrice * args.markup);
        if (Math.abs(expected - p.price) > args.priceTolerance) {
          issues.push(`price ${p.price} != sourcePrice ${p.sourcePrice} × ${args.markup} (expected ${expected})`);
        }
      }

      if (!p.images || p.images.length === 0) issues.push("no images attached");
      for (const im of p.images || []) {
        if (!im.url) {
          issues.push(`image #${im.id} has no url`);
          continue;
        }
        if (!im.url.startsWith("/uploads/")) {
          issues.push(`image #${im.id} url is not local: ${im.url}`);
        }
        for (const pat of FORBIDDEN_HOST_PATTERNS) {
          if (pat.test(im.url)) {
            issues.push(`image #${im.id} url matches forbidden pattern ${pat}: ${im.url}`);
          }
        }
      }

      if (!p.descAr && !p.descEn) issues.push("description missing");
      if (!p.brand || p.brand === "—") issues.push("brand missing (or placeholder)");
      if (!p.categoryId) issues.push("categoryId missing");

      if (mapped) {
        const expectedImageCount = mapped.images?.length ?? 0;
        if (expectedImageCount !== (p.images || []).length) {
          issues.push(`image count mismatch (scraped ${expectedImageCount}, attached ${(p.images || []).length})`);
        }
        const expectedVariantCount = mapped.variants?.length ?? 0;
        if (expectedVariantCount !== p.variants.length) {
          issues.push(`variant count mismatch (scraped ${expectedVariantCount}, in db ${p.variants.length})`);
        }
        /** Make sure each scraped variant landed in the DB (matched by sourceVariantId). */
        for (const sv of mapped.variants || []) {
          if (!sv.sourceVariantId) continue;
          const found = p.variants.find((dv) => dv.sourceVariantId === sv.sourceVariantId);
          if (!found) issues.push(`variant ${sv.sourceVariantId} not persisted`);
        }
      } else {
        issues.push(`no local mapped JSON for handle "${handle}" — re-run scrape-product.mjs`);
      }

      const ok = issues.length === 0;
      console.log(`${ok ? "✅" : "❌"} ${p.sourceHandle}  id=${p.id}  price=${p.price} IQD  warranty="${p.warranty ?? ""}"  images=${p.images.length}  variants=${p.variants.length}`);
      if (!ok) {
        for (const reason of issues) console.log(`     - ${reason}`);
        failedProducts.push({ id: p.id, handle: p.sourceHandle, issues });
        totalIssues += issues.length;
      }
    }

    console.log("");
    console.log(`[verify] inspected ${products.length} product(s); ${failedProducts.length} failed (${totalIssues} issue(s)).`);
    if (failedProducts.length > 0) process.exit(1);
  } finally {
    try { await prisma.$disconnect(); } catch { /* ignore */ }
  }
}

main().catch((e) => {
  console.error("[verify] failed:", e);
  process.exit(1);
});
