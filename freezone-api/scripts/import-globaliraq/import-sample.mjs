#!/usr/bin/env node
// Phase 3 (sample-only) of the importer pipeline.
//
//   For up to `--limit` handles already scraped by scrape-product.mjs, this script:
//     1. Creates a single ImportBatch row in the target DB (via Prisma) and uses
//        its `lockOwner` field as a distributed lock — refuses to start if another
//        batch is already `running` against the same source.
//     2. Resolves a category by --category-slug (`staging-imports` by default)
//        and reads existing brand list via the admin API.
//     3. For each handle:
//          POST /api/admin/products        (without images)
//          for each image:
//            POST /api/admin/media/import-image  (pulls Shopify CDN into /uploads)
//        Records the per-handle outcome in ImportBatch.results.
//
// Modes:
//   --dry-run            (default)  print + write data/dry-run-<batchId>.json,
//                                  do nothing in the FreeZone DB / API.
//   --live               write to DB + HTTP API. Refuses to run without --limit.
//
// Env required for --live:
//   DATABASE_URL                postgres URL of the target FreeZone DB
//   FREEZONE_API_URL            e.g. https://freezone-website.fly.dev or http://127.0.0.1:4000
//   FREEZONE_ADMIN_PASSWORD     admin login password
//
// Hard caps protect the production DB from a runaway:
//   - default --limit must be passed; it is also capped at SAMPLE_MAX (=10).
//   - run aborts on first 500 response unless --continue-on-error is set.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { acquireLocalLock, LockedError } from "./lib/lock.mjs";
import {
  login,
  listCategories,
  createCategory,
  importImage,
  createProduct,
  upsertVariants,
  AdminApiError,
} from "./lib/api-client.mjs";

const DATA_DIR = resolve(import.meta.dirname, "data");
const MAPPED_DIR = resolve(DATA_DIR, "mapped");
/** Belt-and-braces cap: even if a caller passes --limit=1000 we refuse to import past this. */
const SAMPLE_MAX = 10;

function parseArgs(argv) {
  const out = {
    limit: 0,
    live: false,
    continueOnError: false,
    categorySlug: "staging-imports",
    categoryNameAr: "وارد قيد المراجعة (Global Iraq)",
    categoryNameEn: "Staging imports (Global Iraq)",
    source: "globaliraq",
  };
  for (const a of argv) {
    if (a === "--live") { out.live = true; continue; }
    if (a === "--dry-run") { out.live = false; continue; }
    if (a === "--continue-on-error") { out.continueOnError = true; continue; }
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (!m) continue;
    if (m[1] === "limit") out.limit = Number.parseInt(m[2], 10) || 0;
    else if (m[1] === "category-slug") out.categorySlug = m[2];
    else if (m[1] === "category-name-ar") out.categoryNameAr = m[2];
    else if (m[1] === "category-name-en") out.categoryNameEn = m[2];
    else out[m[1]] = m[2];
  }
  if (out.limit <= 0) {
    console.error("Refusing to run without an explicit --limit (max " + SAMPLE_MAX + ").");
    process.exit(2);
  }
  if (out.limit > SAMPLE_MAX) {
    console.error(`--limit ${out.limit} exceeds SAMPLE_MAX=${SAMPLE_MAX}; this importer is sample-only.`);
    process.exit(2);
  }
  return out;
}

function loadMapped(limit) {
  if (!existsSync(MAPPED_DIR)) throw new Error(`Missing ${MAPPED_DIR}. Run scrape-product.mjs first.`);
  const files = readdirSync(MAPPED_DIR).filter((f) => f.endsWith(".json")).sort().slice(0, limit);
  if (files.length === 0) throw new Error(`No mapped products in ${MAPPED_DIR}.`);
  return files.map((f) => ({
    handle: f.replace(/\.json$/, ""),
    mapped: JSON.parse(readFileSync(resolve(MAPPED_DIR, f), "utf8")),
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const localLock = acquireLocalLock();
  try {
    const entries = loadMapped(args.limit);

    if (!args.live) {
      const batchId = `dryrun_${Date.now().toString(36)}`;
      const summary = await runDryRun(entries, batchId, args);
      console.log(`[import] dry-run complete. ${summary.succeeded}/${summary.total} would import.`);
      console.log(`[import] preview written to data/dry-run-${batchId}.json`);
      console.log("[import] re-run with --live to actually write to FreeZone.");
      return;
    }

    /** ---- LIVE MODE ---- */
    requireEnv("DATABASE_URL");
    const apiUrl = requireEnv("FREEZONE_API_URL");
    const adminPw = requireEnv("FREEZONE_ADMIN_PASSWORD");

    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    let batch;
    let cookie;
    try {
      /** DB lock: refuse if another batch is still running against this source. */
      const open = await prisma.importBatch.findFirst({
        where: { source: args.source, status: "running" },
      });
      if (open) {
        throw new Error(
          `Another ImportBatch is running for source=${args.source} (id=${open.id}, owner=${open.lockOwner}, started=${open.startedAt.toISOString()}). Resolve it before starting a new one.`,
        );
      }
      batch = await prisma.importBatch.create({
        data: {
          source: args.source,
          status: "running",
          total: entries.length,
          lockOwner: `${localLock.owner.host}:${localLock.owner.pid}`,
          notes: `sample limit=${args.limit}`,
        },
      });
      console.log(`[import] live batch id=${batch.id}`);

      ({ cookie } = await login(apiUrl, adminPw));
      const category = await ensureCategory(apiUrl, cookie, args);
      console.log(`[import] category id=${category.id} slug=${category.slug}`);

      const results = [];
      let succeeded = 0;
      let failed = 0;
      for (const [i, entry] of entries.entries()) {
        console.log(`[import] (${i + 1}/${entries.length}) ${entry.handle}`);
        const { mapped } = entry;
        const payload = {
          ...mapped.productPayload,
          categoryId: category.id,
          importBatchId: batch.id,
        };
        try {
          const productCreated = await createProduct(apiUrl, cookie, payload);
          const productId = productCreated?.id || productCreated?.product?.id;
          if (!productId) throw new Error("createProduct returned no id: " + JSON.stringify(productCreated));

          /** Pull each Shopify image into FreeZone storage. Keep a sourceUrl → localUrl map
           *  so we can resolve variant.image_id references to the mirrored /uploads/ path. */
          const imageResults = [];
          const localBySourceUrl = new Map();
          for (const img of mapped.images) {
            try {
              const r = await importImage(apiUrl, cookie, {
                src: img.sourceUrl,
                productId,
                alt: img.alt,
              });
              imageResults.push({ sourceUrl: img.sourceUrl, url: r?.url, ok: true });
              if (r?.url) localBySourceUrl.set(img.sourceUrl, r.url);
            } catch (e) {
              imageResults.push({ sourceUrl: img.sourceUrl, ok: false, error: errMessage(e) });
              if (!args.continueOnError) throw e;
            }
          }

          /** Rewrite per-variant imageSourceUrl to the mirrored /uploads/ path so the variants
           *  endpoint's "must be local" check passes. Unknown mappings fall through as null. */
          const variantPayload = mapped.variants.map((v) => ({
            sourceVariantId: v.sourceVariantId,
            sku: v.sku,
            labelEn: v.labelEn,
            labelAr: v.labelAr,
            priceOverride: v.priceOverride,
            oldPrice: v.oldPrice,
            optionName1: v.optionName1,
            optionValue1: v.optionValue1,
            optionName2: v.optionName2,
            optionValue2: v.optionValue2,
            optionName3: v.optionName3,
            optionValue3: v.optionValue3,
            imageUrl: v.imageSourceUrl ? (localBySourceUrl.get(v.imageSourceUrl) ?? null) : null,
            sourceRawJson: v.sourceRawJson,
            quantity: v.quantity,
            active: v.active,
            sortOrder: v.sortOrder,
          }));

          let variantsResult = null;
          if (variantPayload.length > 0) {
            try {
              variantsResult = await upsertVariants(apiUrl, cookie, productId, variantPayload);
            } catch (e) {
              if (!args.continueOnError) throw e;
              variantsResult = { error: errMessage(e) };
            }
          }

          results.push({
            handle: entry.handle,
            status: "ok",
            productId,
            imageResults,
            variantsAttempted: variantPayload.length,
            variantsResult,
          });
          succeeded += 1;
        } catch (e) {
          results.push({ handle: entry.handle, status: "failed", error: errMessage(e) });
          failed += 1;
          if (!args.continueOnError) {
            await prisma.importBatch.update({
              where: { id: batch.id },
              data: { status: "failed", finishedAt: new Date(), succeeded, failed, results },
            });
            throw e;
          }
        }
      }

      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: failed === 0 ? "completed" : "completed_with_errors",
          finishedAt: new Date(),
          succeeded,
          failed,
          results,
        },
      });
      console.log(`[import] batch ${batch.id} done: ok=${succeeded} failed=${failed}`);
    } finally {
      try { await prisma.$disconnect(); } catch { /* ignore */ }
    }
  } catch (e) {
    if (e instanceof LockedError) {
      console.error("[import]", e.message);
      process.exit(2);
    }
    console.error("[import] failed:", e instanceof AdminApiError ? `${e.url} -> ${e.status} ${JSON.stringify(e.body)}` : e);
    process.exit(1);
  } finally {
    localLock.release();
  }
}

async function ensureCategory(apiUrl, cookie, args) {
  const list = await listCategories(apiUrl, cookie);
  const arr = Array.isArray(list) ? list : list?.categories;
  const existing = (arr || []).find((c) => c.slug === args.categorySlug);
  if (existing) return existing;
  console.log(`[import] creating category nameEn="${args.categoryNameEn}"`);
  const created = await createCategory(apiUrl, cookie, {
    nameEn: args.categoryNameEn,
    nameAr: args.categoryNameAr,
  });
  /** API may wrap the row under .category — handle both shapes. */
  return created?.category || created;
}

async function runDryRun(entries, batchId, args) {
  const out = {
    batchId,
    source: args.source,
    mode: "dry-run",
    limit: args.limit,
    plannedAt: new Date().toISOString(),
    total: entries.length,
    succeeded: 0,
    items: [],
  };
  for (const [i, e] of entries.entries()) {
    const { mapped } = e;
    out.items.push({
      handle: e.handle,
      title: mapped.productPayload.nameAr,
      price: mapped.productPayload.price,
      oldPrice: mapped.productPayload.oldPrice,
      sourcePrice: mapped.productPayload.sourcePrice,
      warranty: mapped.productPayload.warranty,
      imageCount: mapped.images.length,
      variantCount: mapped.variants.length,
      flags: mapped.flags,
    });
    out.succeeded += 1;
    console.log(`[import][dry] (${i + 1}/${entries.length}) ${e.handle} → price=${mapped.productPayload.price} IQD, ${mapped.images.length} image(s)`);
  }
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(resolve(DATA_DIR, `dry-run-${batchId}.json`), JSON.stringify(out, null, 2), "utf8");
  return out;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(2);
  }
  return v;
}

function errMessage(e) {
  if (e instanceof AdminApiError) return `${e.status} ${JSON.stringify(e.body)}`;
  return e?.message || String(e);
}

main();
