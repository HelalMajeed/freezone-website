#!/usr/bin/env node
// Lists what an "undo this batch" operation would touch — but never deletes.
// Use this to sanity-check a freshly imported sample before approving an
// actual cleanup (which still has to be performed manually, on purpose).
//
// Usage:
//   DATABASE_URL=... node scripts/import-globaliraq/dry-run-delete.mjs --batch=<id>
//   DATABASE_URL=... node scripts/import-globaliraq/dry-run-delete.mjs --latest

function parseArgs(argv) {
  const out = { batch: null, latest: false };
  for (const a of argv) {
    if (a === "--latest") { out.latest = true; continue; }
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (!m) continue;
    out[m[1]] = m[2];
  }
  if (!out.batch && !out.latest) {
    console.error("Usage: dry-run-delete.mjs --batch=<id> | --latest");
    process.exit(2);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
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

    const products = await prisma.product.findMany({
      where: { importBatchId: batch.id },
      include: { images: true, attributeValues: true, variants: true },
    });

    console.log(`[dry-delete] batch ${batch.id} status=${batch.status}`);
    console.log(`[dry-delete] would delete ${products.length} product row(s).`);
    let imageFileCount = 0;
    let attrCount = 0;
    let variantCount = 0;
    for (const p of products) {
      imageFileCount += p.images.length;
      attrCount += p.attributeValues.length;
      variantCount += p.variants.length;
      console.log(`  - Product id=${p.id} handle=${p.sourceHandle} images=${p.images.length} variants=${p.variants.length} attrs=${p.attributeValues.length}`);
      for (const im of p.images) {
        console.log(`      image url=${im.url} originalSourceUrl=${im.originalSourceUrl ?? "—"}`);
      }
    }
    console.log("");
    console.log(`[dry-delete] cascade summary (NOT executed):`);
    console.log(`  ProductImage rows: ${imageFileCount}`);
    console.log(`  ProductAttributeValue rows: ${attrCount}`);
    console.log(`  ProductVariant rows: ${variantCount}`);
    console.log("");
    console.log("[dry-delete] NOTE: on-disk files under /uploads/products/... are NOT removed by");
    console.log("[dry-delete] deleting Product rows. The Fly volume keeps them until you reclaim");
    console.log("[dry-delete] storage manually. This script intentionally performs zero writes.");
  } finally {
    try { await prisma.$disconnect(); } catch { /* ignore */ }
  }
}

main().catch((e) => {
  console.error("[dry-delete] failed:", e);
  process.exit(1);
});
