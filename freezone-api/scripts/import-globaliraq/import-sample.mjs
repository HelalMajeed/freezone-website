#!/usr/bin/env node
// Phase 3 (sample-only) of the importer pipeline.
//
//   For up to `--limit` handles already scraped by scrape-product.mjs, this script:
//     1. Creates a single ImportBatch row in the target DB (via Prisma) and uses
//        its `lockOwner` field as a distributed lock — refuses to start if another
//        batch is already `running` against the same source.
//     2. Resolves the target category (Phase 0: always the stable `needs-review`
//        fallback; Phase 1 plugs in product_type/vendor matching).
//     3. For each handle:
//          - skip if a Product with the same `sourceHandle` already exists
//          - prisma.product.create  (specs JSON + warranty + source* preserved)
//          - POST /api/admin/media/import-image (per image, FreeZone-mirrored copy)
//          - POST /api/admin/products/:id/variants (every Shopify variant)
//
//   Why direct Prisma instead of POST /api/admin/products?
//     The HTTP route runs `validateProductSpecsAgainstCategory`, which hard-fails
//     on any spec key not registered as a `CategoryAttribute` for the target
//     category. Imported products carry arbitrary keys parsed from `body_html`
//     and the per-category schema isn't authored yet, so a pure HTTP path either
//     drops specs (unacceptable — spec data must be preserved) or pollutes the
//     attribute schema with auto-generated keys. Writing Product.specs JSON
//     directly preserves the data verbatim and leaves CategoryAttribute curation
//     to a separate admin workflow.
//
// Modes:
//   --dry-run            (default)  print + write data/dry-run-<batchId>.json,
//                                  do nothing in the FreeZone DB / API.
//   --live               write to DB + HTTP API. Refuses to run without --limit.
//
// Env required for --live:
//   DATABASE_URL                postgres URL of the target FreeZone DB
//   FREEZONE_API_URL            e.g. https://freezone-website.fly.dev or http://127.0.0.1:4000
//   FREEZONE_ADMIN_PASSWORD     admin login password (used for image-import + variants endpoints)
//
// Hard caps protect the production DB from a runaway:
//   - default --limit must be passed; it is also capped at SAMPLE_MAX (=10).
//   - run aborts on first 500 response unless --continue-on-error is set.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { acquireLocalLock, LockedError } from "./lib/lock.mjs";
import {
  login,
  importImage,
  upsertVariants,
  AdminApiError,
} from "./lib/api-client.mjs";
import { ensureNeedsReviewCategory } from "./lib/category-resolve.mjs";

const DATA_DIR = resolve(import.meta.dirname, "data");
const MAPPED_DIR = resolve(DATA_DIR, "mapped");
/** Belt-and-braces cap: even if a caller passes --limit=1000 we refuse to import past this. */
const SAMPLE_MAX = 10;

function parseArgs(argv) {
  const out = {
    limit: 0,
    live: false,
    continueOnError: false,
    source: "globaliraq",
  };
  for (const a of argv) {
    if (a === "--live") { out.live = true; continue; }
    if (a === "--dry-run") { out.live = false; continue; }
    if (a === "--continue-on-error") { out.continueOnError = true; continue; }
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (!m) continue;
    if (m[1] === "limit") out.limit = Number.parseInt(m[2], 10) || 0;
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
      const category = await ensureNeedsReviewCategory(prisma);
      console.log(`[import] fallback category id=${category.id} slug=${category.slug}`);

      const results = [];
      let succeeded = 0;
      let failed = 0;
      let skipped = 0;
      for (const [i, entry] of entries.entries()) {
        console.log(`[import] (${i + 1}/${entries.length}) ${entry.handle}`);
        const { mapped } = entry;

        /** Idempotency: skip handles already in the DB so re-runs don't dupe. */
        const dupe = await prisma.product.findFirst({
          where: { sourceHandle: mapped.productPayload.sourceHandle },
          select: { id: true },
        });
        if (dupe) {
          console.log(`[import]   skipped — already imported (product id=${dupe.id})`);
          results.push({ handle: entry.handle, status: "skipped", productId: dupe.id });
          skipped += 1;
          continue;
        }

        try {
          const productId = await createProductViaPrisma(prisma, mapped, category.id, batch.id);

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
          notes: `sample limit=${args.limit}; skipped=${skipped} (dedupe)`,
        },
      });
      console.log(`[import] batch ${batch.id} done: ok=${succeeded} failed=${failed} skipped=${skipped}`);
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

/**
 * Direct-Prisma product create. See the file header for why this bypasses the
 * HTTP /api/admin/products route. The shape mirrors the mapped payload from
 * map-product.mjs and preserves `specs` JSON verbatim.
 */
async function createProductViaPrisma(prisma, mapped, categoryId, batchId) {
  const p = mapped.productPayload;
  const row = await prisma.product.create({
    data: {
      categoryId,
      brand: p.brand || "—",
      sku: (p.sku || "").trim() || "—",
      model: typeof p.model === "string" ? p.model.trim() : "",
      quantity: Number.isFinite(p.quantity) ? p.quantity : 1,
      nameEn: p.nameEn,
      nameAr: p.nameAr || p.nameEn,
      descEn: p.descEn ?? "",
      descAr: p.descAr ?? "",
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      warranty: p.warranty || null,
      specs: (p.specs && typeof p.specs === "object" ? p.specs : {}),
      published: false,
      isNew: p.isNew !== false,
      sourceUrl: p.sourceUrl ?? null,
      sourceHandle: p.sourceHandle ?? null,
      sourcePrice: typeof p.sourcePrice === "number" ? p.sourcePrice : null,
      importedAt: new Date(),
      importBatchId: batchId,
    },
    select: { id: true },
  });
  return row.id;
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
      specsKeys: mapped.productPayload.specs ? Object.keys(mapped.productPayload.specs) : [],
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
