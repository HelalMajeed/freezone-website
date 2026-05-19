/**
 * Map legacy product.specs → ProductAttributeValue with displayValue + normalized filter tokens.
 * Safe to re-run (idempotent per product). Does not delete products.
 *
 * Run: npm run classification:sync-legacy
 * Dry-run: npx tsx scripts/sync-legacy-product-specs.ts --dry-run
 */
import { PrismaClient } from "@prisma/client";
import {
  loadClassificationScriptEnv,
  maskDatabaseUrl,
  parseClassificationScriptArgs,
} from "./classification-script-env";
import {
  buildLegacyProductSpecsPayload,
  persistLegacyProductSpecs,
  type LegacySyncPreview,
} from "./lib/legacy-spec-sync";

const { dryRun } = parseClassificationScriptArgs(process.argv.slice(2));
loadClassificationScriptEnv();

console.log(`[sync-legacy-specs] DATABASE_URL=${maskDatabaseUrl(process.env.DATABASE_URL!)}`);
if (dryRun) {
  console.log("[sync-legacy-specs] DRY-RUN — no database writes.\n");
}

const prisma = new PrismaClient();

function formatPreview(p: LegacySyncPreview): string {
  const parts = [
    p.processor_family != null ? `processor_family=${p.processor_family}` : null,
    p.gpu_model != null ? `gpu_model=${p.gpu_model}` : null,
    p.ram_size != null ? `ram_size=${p.ram_size}` : null,
    p.storage_size != null ? `storage_size=${p.storage_size}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "(no filter facets derived)";
}

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      categoryId: true,
      specs: true,
      category: { select: { slug: true } },
    },
  });

  let synced = 0;
  const skipped: { id: number; slug: string; reason: string }[] = [];
  const failed: { id: number; slug: string; reason: string }[] = [];

  for (const p of products) {
    const built = await buildLegacyProductSpecsPayload(prisma, p);
    if (!built.ok) {
      skipped.push({ id: p.id, slug: p.category.slug, reason: built.reason });
      continue;
    }

    if (dryRun) {
      console.log(
        `product ${p.id} (${p.category.slug}) preview: ${formatPreview(built.preview)} [${built.attrCount} attrs]`,
      );
      synced++;
      continue;
    }

    const saved = await persistLegacyProductSpecs(prisma, p.id, p.categoryId, built.payload);
    if (!saved.ok) {
      failed.push({ id: p.id, slug: p.category.slug, reason: saved.error });
      continue;
    }

    console.log(
      `product ${p.id} (${p.category.slug}): synced ${built.attrCount} attrs — ${formatPreview(built.preview)}`,
    );
    synced++;
  }

  console.log("\n--- summary ---");
  console.log(`total products: ${products.length}`);
  console.log(dryRun ? `would sync: ${synced}` : `synced: ${synced}`);
  console.log(`skipped: ${skipped.length}`);
  console.log(dryRun ? `failed: 0 (dry-run)` : `failed: ${failed.length}`);

  if (skipped.length) {
    console.log("\nSkipped products (first 20):");
    for (const s of skipped.slice(0, 20)) {
      console.log(`  #${s.id} [${s.slug}]: ${s.reason}`);
    }
    if (skipped.length > 20) console.log(`  ... and ${skipped.length - 20} more`);
  }

  if (!dryRun && failed.length) {
    console.log("\nFailed products:");
    for (const f of failed) {
      console.log(`  #${f.id} [${f.slug}]: ${f.reason}`);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
