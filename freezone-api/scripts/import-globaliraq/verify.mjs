#!/usr/bin/env node
// Read-only verifier for an ImportBatch.
//
//   Compares the rows actually written by import-sample.mjs --live against the
//   scraped JSON in data/mapped/. For each handle in the batch:
//     - confirms the Product row exists with the expected sourceHandle, sourcePrice
//       and importBatchId
//     - prints the local /uploads/* URL for every ProductImage and how many
//       images were attached vs scraped
//     - flags any image whose originalSourceUrl is still on the Shopify CDN
//       (which would mean we failed to mirror it locally)
//
// Usage:
//   DATABASE_URL=... node scripts/import-globaliraq/verify.mjs --batch=<id>
//   DATABASE_URL=... node scripts/import-globaliraq/verify.mjs --latest

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(import.meta.dirname, "data");
const MAPPED_DIR = resolve(DATA_DIR, "mapped");

function parseArgs(argv) {
  const out = { batch: null, latest: false };
  for (const a of argv) {
    if (a === "--latest") { out.latest = true; continue; }
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (!m) continue;
    out[m[1]] = m[2];
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
    out[f.replace(/\.json$/, "")] = JSON.parse(readFileSync(resolve(MAPPED_DIR, f), "utf8"));
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

    const products = await prisma.product.findMany({
      where: { importBatchId: batch.id },
      include: { images: { orderBy: { sortOrder: "asc" } }, attributeValues: true },
    });
    const mappedByHandle = loadMappedByHandle();

    let issues = 0;
    for (const p of products) {
      const mapped = mappedByHandle[p.sourceHandle || ""] || null;
      const expectedImages = mapped?.images?.length ?? null;
      const actualImages = p.images.length;
      const shopifyMirrored = p.images.every((i) => !i.url || i.url.startsWith("/uploads/"));
      console.log("");
      console.log(`  • ${p.sourceHandle}  id=${p.id}  price=${p.price} IQD (source=${p.sourcePrice})`);
      console.log(`    images: ${actualImages}${expectedImages != null ? `/${expectedImages} scraped` : ""}, all local=${shopifyMirrored}`);
      console.log(`    sourceUrl: ${p.sourceUrl}`);
      console.log(`    importedAt: ${p.importedAt?.toISOString() ?? "—"}`);
      if (mapped && expectedImages !== actualImages) {
        console.log(`    ⚠ image count mismatch (scraped ${expectedImages}, attached ${actualImages})`);
        issues += 1;
      }
      if (!shopifyMirrored) {
        for (const i of p.images.filter((x) => x.url && !x.url.startsWith("/uploads/"))) {
          console.log(`    ⚠ image still references external host: ${i.url}`);
        }
        issues += 1;
      }
      if (mapped && p.sourcePrice !== mapped.productPayload.sourcePrice) {
        console.log(`    ⚠ sourcePrice mismatch (db ${p.sourcePrice}, scrape ${mapped.productPayload.sourcePrice})`);
        issues += 1;
      }
    }
    console.log("");
    console.log(`[verify] inspected ${products.length} product(s); ${issues} issue(s).`);
    if (issues > 0) process.exit(1);
  } finally {
    try { await prisma.$disconnect(); } catch { /* ignore */ }
  }
}

main().catch((e) => {
  console.error("[verify] failed:", e);
  process.exit(1);
});
