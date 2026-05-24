#!/usr/bin/env node
// Phase 2 of the importer pipeline.
//
//   Read data/handles.json (produced by discover.mjs) and fetch each handle's
//   Shopify product JSON at /products/<handle>.json. Save raw responses to
//   data/products/<handle>.json. Also writes data/mapped/<handle>.json with the
//   FreeZone-shaped payload returned by map-product.mjs, so the importer step
//   does no transformations live.
//
// Usage:
//   node scripts/import-globaliraq/scrape-product.mjs [--limit=N] [--markup=1.35] [--locale=ar]
//
// No DB / FreeZone-API access — pure HTTP GETs against the public storefront.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { shopifyToFreezone, DEFAULT_MARKUP } from "./lib/map-product.mjs";
import { acquireLocalLock, LockedError } from "./lib/lock.mjs";

const DATA_DIR = resolve(import.meta.dirname, "data");
const RAW_DIR = resolve(DATA_DIR, "products");
const MAPPED_DIR = resolve(DATA_DIR, "mapped");

function parseArgs(argv) {
  const out = { limit: 0, markup: DEFAULT_MARKUP, base: null, locale: "ar" };
  for (const a of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (!m) continue;
    if (m[1] === "limit") out.limit = Number.parseInt(m[2], 10) || 0;
    else if (m[1] === "markup") out.markup = Number.parseFloat(m[2]) || DEFAULT_MARKUP;
    else out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lock = acquireLocalLock();
  try {
    const handlesPath = resolve(DATA_DIR, "handles.json");
    if (!existsSync(handlesPath)) {
      throw new Error(`Missing ${handlesPath}. Run discover.mjs first.`);
    }
    const { base, handles } = JSON.parse(readFileSync(handlesPath, "utf8"));
    const baseUrl = args.base || base;
    const cap = args.limit > 0 ? Math.min(args.limit, handles.length) : handles.length;
    const slice = handles.slice(0, cap);

    mkdirSync(RAW_DIR, { recursive: true });
    mkdirSync(MAPPED_DIR, { recursive: true });

    console.log(`[scrape] base=${baseUrl} count=${slice.length} markup=${args.markup}`);

    const summary = [];
    for (const [i, h] of slice.entries()) {
      try {
        /** Use the sitemap URL (already URL-encoded for non-ASCII handles like `intel®-core™-...`) and append `.json`. */
        const productJsonUrl = h.url
          .replace(/\/(ar|en)\/products\//, "/products/")
          .replace(/[?#].*$/, "")
          .replace(/\/?$/, "") + ".json";
        process.stdout.write(`[scrape] (${i + 1}/${slice.length}) ${h.handle} ... `);
        const res = await fetch(productJsonUrl, {
          headers: { "User-Agent": "freezone-importer/1 (+admin@freezone-iq.com)" },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        const product = json.product || json;

        const safeName = h.handle.replace(/[^A-Za-z0-9._-]+/g, "_");
        writeFileSync(resolve(RAW_DIR, `${safeName}.json`), JSON.stringify(product, null, 2), "utf8");
        const mapped = shopifyToFreezone(product, {
          baseUrl,
          source: "globaliraq",
          markup: args.markup,
        });
        writeFileSync(
          resolve(MAPPED_DIR, `${safeName}.json`),
          JSON.stringify(mapped, null, 2),
          "utf8",
        );

        summary.push({
          handle: h.handle,
          title: product.title,
          vendor: product.vendor,
          product_type: product.product_type,
          variantCount: (product.variants || []).length,
          imageCount: (product.images || []).length,
          sourcePrice: mapped.productPayload.sourcePrice,
          oldPrice: mapped.productPayload.oldPrice,
          price: mapped.productPayload.price,
          warranty: mapped.productPayload.warranty,
          flags: mapped.flags,
        });
        console.log("ok");
        /** Conservative rate-limit so Shopify doesn't flag us. */
        await sleep(250);
      } catch (e) {
        console.log("FAIL");
        summary.push({ handle: h.handle, error: e.message || String(e) });
      }
    }

    writeFileSync(
      resolve(DATA_DIR, "scrape-summary.json"),
      JSON.stringify({ scrapedAt: new Date().toISOString(), summary }, null, 2),
      "utf8",
    );
    const ok = summary.filter((s) => !s.error).length;
    const fail = summary.length - ok;
    console.log(`[scrape] done: ${ok} ok / ${fail} failed`);
    if (fail > 0) console.log("[scrape] see data/scrape-summary.json for details");
  } catch (e) {
    if (e instanceof LockedError) {
      console.error("[scrape] another import job appears to be running:", e.message);
      process.exit(2);
    }
    console.error("[scrape] failed:", e);
    process.exit(1);
  } finally {
    lock.release();
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

main();
