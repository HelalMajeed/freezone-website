#!/usr/bin/env node
// Phase 1 of the importer pipeline.
//
//   Crawl https://globaliraq.iq/sitemap.xml -> products sitemap -> list of
//   /products/<handle> URLs. Writes data/handles.json with the full list and
//   prints summary stats. Does not touch the FreeZone API or any database.
//
// Usage:
//   node scripts/import-globaliraq/discover.mjs [--locale=ar|en] [--limit=N]
//   node scripts/import-globaliraq/discover.mjs --base=https://globaliraq.iq
//
// The output file is gitignored; this script is safe to re-run.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetchProductUrls, handleFromUrl } from "./lib/sitemap.mjs";
import { acquireLocalLock, LockedError } from "./lib/lock.mjs";

const DATA_DIR = resolve(import.meta.dirname, "data");

function parseArgs(argv) {
  const out = { base: "https://globaliraq.iq", locale: "ar", limit: 0 };
  for (const a of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (!m) continue;
    if (m[1] === "limit") out.limit = Number.parseInt(m[2], 10) || 0;
    else out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lock = acquireLocalLock();
  try {
    console.log(`[discover] base=${args.base} locale=${args.locale}${args.limit ? ` limit=${args.limit}` : ""}`);
    const urls = await fetchProductUrls(args.base, { locale: args.locale });
    const handles = [];
    const seen = new Set();
    for (const u of urls) {
      const h = handleFromUrl(u);
      if (!h || seen.has(h)) continue;
      seen.add(h);
      handles.push({ handle: h, url: u });
      if (args.limit > 0 && handles.length >= args.limit) break;
    }

    mkdirSync(DATA_DIR, { recursive: true });
    const out = {
      base: args.base,
      locale: args.locale,
      discoveredAt: new Date().toISOString(),
      totalUrls: urls.length,
      uniqueHandles: handles.length,
      handles,
    };
    const outPath = resolve(DATA_DIR, "handles.json");
    writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

    console.log(`[discover] total URLs in sitemap: ${urls.length}`);
    console.log(`[discover] unique product handles: ${handles.length}`);
    console.log(`[discover] wrote ${outPath}`);
    if (handles.length > 0) {
      console.log("[discover] first 5 handles:");
      for (const h of handles.slice(0, 5)) console.log(`  - ${h.handle}  (${h.url})`);
    }
  } catch (e) {
    if (e instanceof LockedError) {
      console.error("[discover] another import job appears to be running:", e.message);
      process.exit(2);
    }
    console.error("[discover] failed:", e);
    process.exit(1);
  } finally {
    lock.release();
  }
}

main();
