/**
 * Re-derive laptop filter facets from stored display values (EAV).
 * Does not delete products or run prisma db seed.
 *
 * Dry-run: npx tsx scripts/repair-laptop-filter-values.ts --dry-run
 * Apply:   npx tsx scripts/repair-laptop-filter-values.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  loadClassificationScriptEnv,
  maskDatabaseUrl,
  parseClassificationScriptArgs,
} from "./classification-script-env";
import {
  buildLaptopFilterRepairFromEav,
  persistLegacyProductSpecs,
  type LaptopFilterPreview,
} from "./lib/legacy-spec-sync";

const { dryRun } = parseClassificationScriptArgs(process.argv.slice(2));
loadClassificationScriptEnv();

const TRACK_KEYS: (keyof LaptopFilterPreview)[] = [
  "screen_size",
  "display_resolution",
  "refresh_rate",
  "gpu_model",
  "processor_family",
  "ram_size",
  "storage_size",
];

function fmtPreview(p: LaptopFilterPreview): string {
  return TRACK_KEYS.map((k) => `${k}=${p[k] ?? "—"}`).join(", ");
}

function diffLine(before: LaptopFilterPreview, after: LaptopFilterPreview): string {
  const parts: string[] = [];
  for (const k of TRACK_KEYS) {
    const b = before[k] ?? null;
    const a = after[k] ?? null;
    if (b !== a) parts.push(`${k}: ${b ?? "—"} → ${a ?? "—"}`);
  }
  return parts.length ? parts.join("; ") : "(no filter changes)";
}

const prisma = new PrismaClient();

async function main() {
  console.log(`[repair-laptop-filters] DATABASE_URL=${maskDatabaseUrl(process.env.DATABASE_URL!)}`);
  if (dryRun) console.log("[repair-laptop-filters] DRY-RUN — no database writes.\n");

  const laptops = await prisma.category.findFirst({
    where: { slug: "laptops" },
    select: { id: true },
  });
  if (!laptops) {
    console.error("laptops category not found");
    process.exit(1);
  }

  const products = await prisma.product.findMany({
    where: { categoryId: laptops.id },
    select: { id: true, categoryId: true },
    orderBy: { id: "asc" },
  });

  let repaired = 0;
  let unchanged = 0;
  const skipped: { id: number; reason: string }[] = [];
  const failed: { id: number; reason: string }[] = [];

  for (const p of products) {
    const built = await buildLaptopFilterRepairFromEav(prisma, p);
    if (!built.ok) {
      skipped.push({ id: p.id, reason: built.reason });
      continue;
    }

    if (!built.changed) {
      unchanged++;
      continue;
    }

    if (dryRun) {
      console.log(`product #${p.id}`);
      console.log(`  before: ${fmtPreview(built.before)}`);
      console.log(`  after:  ${fmtPreview(built.after)}`);
      console.log(`  diff:   ${diffLine(built.before, built.after)}`);
      repaired++;
      continue;
    }

    const saved = await persistLegacyProductSpecs(prisma, p.id, p.categoryId, built.payload);
    if (!saved.ok) {
      failed.push({ id: p.id, reason: saved.error });
      continue;
    }

    console.log(`product #${p.id}: ${diffLine(built.before, built.after)}`);
    repaired++;
  }

  console.log("\n--- summary ---");
  console.log(`laptop products: ${products.length}`);
  console.log(dryRun ? `would repair: ${repaired}` : `repaired: ${repaired}`);
  console.log(`unchanged: ${unchanged}`);
  console.log(`skipped: ${skipped.length}`);
  if (!dryRun) console.log(`failed: ${failed.length}`);

  if (skipped.length) {
    console.log("\nSkipped (first 15):");
    for (const s of skipped.slice(0, 15)) {
      console.log(`  #${s.id}: ${s.reason}`);
    }
  }

  if (!dryRun && failed.length) {
    console.log("\nFailed:");
    for (const f of failed) {
      console.log(`  #${f.id}: ${f.reason}`);
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
