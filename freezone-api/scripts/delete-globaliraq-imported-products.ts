/**
 * Safely remove products imported from Global Iraq only (never legacy catalog rows).
 *
 * @see docs/GLOBALIRAQ_IMPORT_README.md
 *
 * Preview:
 *   npx tsx scripts/delete-globaliraq-imported-products.ts --dry-run
 *
 * Delete (requires backup + explicit flag):
 *   npx tsx scripts/delete-globaliraq-imported-products.ts --confirm
 */
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.join(process.cwd(), "..", "freezone-web", ".env") });

import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXPECTED_EXPORT_PRODUCTS = 1230;
const WARRANTY_MARKER = "ضمان سنتين وكالة";
const logsDir = path.join(process.cwd(), "logs");

function resolveReportPath(argv: string[]): string {
  const idx = argv.indexOf("--report");
  if (idx >= 0 && argv[idx + 1]) {
    const custom = argv[idx + 1];
    return path.isAbsolute(custom) ? custom : path.join(logsDir, custom);
  }
  return path.join(logsDir, "globaliraq-delete-report.json");
}
const publicRoot = path.join(process.cwd(), "public");

type Report = {
  mode: "dry_run" | "delete";
  started_at: string;
  finished_at: string;
  backup_path: string | null;
  database_hint: string;
  selection: {
    criteria: string[];
    products_to_delete: number;
    products_legacy_total: number;
    products_with_source_handle: number;
    products_with_imported_at: number;
    products_with_globaliraq_url: number;
    products_with_globaliraq_storage: number;
    products_warranty_only_not_selected: number;
  };
  would_delete_or_deleted: {
    products: number;
    images: number;
    variants: number;
    attribute_values: number;
    secondary_categories: number;
    image_files: number;
    brands_orphaned_removed: number;
  };
  preserved: {
    products_not_matching: number;
    categories_touched: number;
  };
  sample_products: Array<{
    id: number;
    sourceHandle: string | null;
    sourceUrl: string | null;
    nameEn: string;
    importedAt: string | null;
    storage: string;
  }>;
  warnings: string[];
  skipped_products: Array<{ id: number; reason: string }>;
  errors: string[];
  deleted_products?: number;
  deleted_images?: number;
  deleted_variants?: number;
  deleted_specs?: number;
  deleted_files?: number;
};

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes("--dry-run") || !argv.includes("--confirm"),
    confirm: argv.includes("--confirm"),
    skipBackup: argv.includes("--skip-backup"),
    skipFiles: argv.includes("--skip-files"),
  };
}

/** Products that belong to the Global Iraq import — not legacy manual catalog. */
export function globalIraqProductWhere(): Prisma.ProductWhereInput {
  return {
    OR: [
      { sourceHandle: { not: null } },
      { importedAt: { not: null } },
      {
        sourceUrl: {
          contains: "globaliraq.iq",
          mode: "insensitive",
        },
      },
      { storage: { startsWith: "globaliraq|" } },
    ],
  };
}

function localPathFromUploadUrl(url: string): string | null {
  const u = url.trim();
  if (!u.startsWith("/uploads/")) return null;
  return path.join(publicRoot, u.replace(/^\//, "").replace(/\//g, path.sep));
}

async function takeBackup(): Promise<string | null> {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url.replace(/^postgresql:/, "postgres:"));
  } catch {
    return null;
  }

  const host = parsed.hostname;
  const port = parsed.port || "5432";
  const user = decodeURIComponent(parsed.username);
  const password = parsed.password ? decodeURIComponent(parsed.password) : "";
  const db = parsed.pathname.replace(/^\//, "").split("?")[0] || "postgres";

  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const out = path.join(logsDir, `freezone-before-globaliraq-delete-${stamp}.dump`);

  const candidates = [
    "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
    "pg_dump",
  ];
  const pgDump = candidates.find((c) => c === "pg_dump" || existsSync(c)) ?? "pg_dump";

  const env = { ...process.env, PGPASSWORD: password };
  const r = spawnSync(
    pgDump,
    ["-h", host, "-p", port, "-U", user, "-F", "c", "-f", out, db],
    { env, encoding: "utf8", shell: false },
  );
  if (r.status !== 0) {
    throw new Error(`pg_dump failed: ${r.stderr || r.stdout || "unknown"}`);
  }
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const reportPath = resolveReportPath(argv);
  const opts = parseArgs();
  if (opts.confirm && opts.dryRun) {
    console.error("Use either --dry-run or --confirm, not both.");
    process.exit(1);
  }

  const startedAt = new Date().toISOString();
  const report: Report = {
    mode: opts.dryRun ? "dry_run" : "delete",
    started_at: startedAt,
    finished_at: "",
    backup_path: null,
    database_hint: (process.env.DATABASE_URL ?? "").replace(/:[^:@/]+@/, ":***@"),
    selection: {
      criteria: [
        "sourceHandle IS NOT NULL",
        "importedAt IS NOT NULL",
        "sourceUrl ILIKE '%globaliraq.iq%'",
        "storage LIKE 'globaliraq|%'",
      ],
      products_to_delete: 0,
      products_legacy_total: 0,
      products_with_source_handle: 0,
      products_with_imported_at: 0,
      products_with_globaliraq_url: 0,
      products_with_globaliraq_storage: 0,
      products_warranty_only_not_selected: 0,
    },
    would_delete_or_deleted: {
      products: 0,
      images: 0,
      variants: 0,
      attribute_values: 0,
      secondary_categories: 0,
      image_files: 0,
      brands_orphaned_removed: 0,
    },
    preserved: {
      products_not_matching: 0,
      categories_touched: 0,
    },
    sample_products: [],
    warnings: [],
    skipped_products: [],
    errors: [],
  };

  const where = globalIraqProductWhere();
  const totalProducts = await prisma.product.count();
  const toDelete = await prisma.product.findMany({
    where,
    select: {
      id: true,
      sourceHandle: true,
      sourceUrl: true,
      nameEn: true,
      importedAt: true,
      storage: true,
      brandId: true,
      categoryId: true,
      images: { select: { id: true, url: true } },
      variants: { select: { id: true } },
      attributeValues: { select: { id: true } },
      secondaryCategories: { select: { categoryId: true } },
      specs: true,
    },
    orderBy: { id: "asc" },
  });

  report.selection.products_to_delete = toDelete.length;
  report.selection.products_with_source_handle = await prisma.product.count({
    where: { sourceHandle: { not: null } },
  });
  report.selection.products_with_imported_at = await prisma.product.count({
    where: { importedAt: { not: null } },
  });
  report.selection.products_with_globaliraq_url = await prisma.product.count({
    where: { sourceUrl: { contains: "globaliraq.iq", mode: "insensitive" } },
  });
  report.selection.products_with_globaliraq_storage = await prisma.product.count({
    where: { storage: { startsWith: "globaliraq|" } },
  });
  report.selection.products_legacy_total = totalProducts;
  report.selection.products_warranty_only_not_selected = await prisma.product.count({
    where: {
      warranty: WARRANTY_MARKER,
      NOT: where,
    },
  });
  report.preserved.products_not_matching = totalProducts - toDelete.length;

  const imageRows = toDelete.reduce((n, p) => n + p.images.length, 0);
  const variantRows = toDelete.reduce((n, p) => n + p.variants.length, 0);
  const attrRows = toDelete.reduce((n, p) => n + p.attributeValues.length, 0);
  const secCatRows = toDelete.reduce((n, p) => n + p.secondaryCategories.length, 0);
  const specsProducts = toDelete.filter((p) => p.specs != null && JSON.stringify(p.specs) !== "{}").length;

  const filePaths = new Set<string>();
  for (const p of toDelete) {
    for (const img of p.images) {
      const local = localPathFromUploadUrl(img.url);
      if (local) filePaths.add(local);
    }
  }

  report.would_delete_or_deleted = {
    products: toDelete.length,
    images: imageRows,
    variants: variantRows,
    attribute_values: attrRows,
    secondary_categories: secCatRows,
    image_files: [...filePaths].filter((f) => existsSync(f)).length,
    brands_orphaned_removed: 0,
  };

  report.preserved.categories_touched = new Set(toDelete.map((p) => p.categoryId)).size;

  report.sample_products = toDelete.slice(0, 10).map((p) => ({
    id: p.id,
    sourceHandle: p.sourceHandle,
    sourceUrl: p.sourceUrl,
    nameEn: p.nameEn,
    importedAt: p.importedAt?.toISOString() ?? null,
    storage: p.storage,
  }));

  if (toDelete.length === 0) {
    report.warnings.push("No Global Iraq products matched — nothing to delete.");
  } else if (toDelete.length > EXPECTED_EXPORT_PRODUCTS) {
    report.warnings.push(
      `Count ${toDelete.length} exceeds export size (${EXPECTED_EXPORT_PRODUCTS}) — review sample before --confirm.`,
    );
  } else if (toDelete.length < EXPECTED_EXPORT_PRODUCTS * 0.9 && toDelete.length > 0) {
    report.warnings.push(
      `Count ${toDelete.length} is below ~90% of export (${EXPECTED_EXPORT_PRODUCTS}) — partial import or criteria mismatch.`,
    );
  }

  if (report.selection.products_warranty_only_not_selected > 0) {
    report.warnings.push(
      `${report.selection.products_warranty_only_not_selected} product(s) have warranty text but are NOT selected (no import markers).`,
    );
  }

  const legacyOnly = await prisma.product.count({
    where: {
      storage: { startsWith: "globaliraq|" },
      sourceHandle: null,
      importedAt: null,
      OR: [{ sourceUrl: null }, { sourceUrl: { not: { contains: "globaliraq.iq" } } }],
    },
  });
  if (legacyOnly > 0) {
    report.warnings.push(`${legacyOnly} row(s) matched via storage prefix only (legacy import path).`);
  }

  console.log("\n=== Global Iraq import deletion preview ===\n");
  console.log(`Mode: ${opts.dryRun ? "DRY-RUN (no changes)" : "DELETE"}`);
  console.log(`Database: ${report.database_hint}`);
  console.log(`\nProducts to ${opts.dryRun ? "delete" : "DELETE"}: ${toDelete.length}`);
  console.log(`Legacy products preserved: ${report.preserved.products_not_matching}`);
  console.log(`  Images: ${imageRows}`);
  console.log(`  Variants: ${variantRows}`);
  console.log(`  Attribute values (specs EAV): ${attrRows}`);
  console.log(`  Products with specs JSON: ${specsProducts}`);
  console.log(`  Secondary categories: ${secCatRows}`);
  console.log(`  Local image files on disk: ${report.would_delete_or_deleted.image_files}`);
  console.log("\nFirst 10 products:");
  for (const s of report.sample_products) {
    console.log(`  #${s.id} handle=${s.sourceHandle ?? "—"} | ${s.nameEn.slice(0, 70)}`);
  }
  if (report.warnings.length) {
    console.log("\nWarnings:");
    for (const w of report.warnings) console.log(`  ⚠ ${w}`);
  }

  console.log(
    "\nNote: This script removes local files under freezone-api/public/uploads only.",
  );
  console.log(
    "Fly production volume (/app/public/uploads) is NOT touched — clean separately after DB delete.",
  );

  if (opts.dryRun) {
    report.finished_at = new Date().toISOString();
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(logsDir, { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`\nReport: ${reportPath}`);
    console.log("\nTo delete after review: npx tsx scripts/delete-globaliraq-imported-products.ts --confirm");
    return;
  }

  if (!opts.confirm) {
    console.error("Pass --confirm to execute deletion.");
    process.exit(1);
  }

  if (!opts.skipBackup) {
    console.log("\nCreating database backup…");
    try {
      report.backup_path = await takeBackup();
      console.log(`Backup OK: ${report.backup_path}`);
    } catch (e) {
      report.errors.push(e instanceof Error ? e.message : String(e));
      console.error("Backup failed — aborting.", e);
      process.exit(1);
    }
  }

  const brandIds = new Set<number>();
  let deletedFiles = 0;

  for (const p of toDelete) {
    try {
      if (!opts.skipFiles) {
        for (const img of p.images) {
          const local = localPathFromUploadUrl(img.url);
          if (local && existsSync(local)) {
            await unlink(local);
            deletedFiles += 1;
          }
        }
      }
      if (p.brandId) brandIds.add(p.brandId);
      await prisma.product.delete({ where: { id: p.id } });
    } catch (e) {
      report.skipped_products.push({
        id: p.id,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  let brandsRemoved = 0;
  for (const bid of brandIds) {
    const left = await prisma.product.count({ where: { brandId: bid } });
    if (left === 0) {
      try {
        await prisma.brand.delete({ where: { id: bid } });
        brandsRemoved += 1;
      } catch (e) {
        report.errors.push(`brand ${bid}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const remainingGi = await prisma.product.count({ where });
  const finalProductCount = await prisma.product.count();
  report.deleted_products = toDelete.length - report.skipped_products.length;
  report.deleted_images = imageRows;
  report.deleted_variants = variantRows;
  report.deleted_specs = attrRows + specsProducts;
  report.deleted_files = deletedFiles;
  report.skipped_old_products = finalProductCount;
  report.final_product_count = finalProductCount;
  report.would_delete_or_deleted.brands_orphaned_removed = brandsRemoved;
  report.mode = "delete";
  report.finished_at = new Date().toISOString();

  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(logsDir, { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== Deletion complete ===");
  console.log(`Deleted products: ${report.deleted_products}`);
  console.log(`Remaining Global Iraq rows: ${remainingGi}`);
  console.log(`Report: ${reportPath}`);
  if (remainingGi > 0) {
    console.error("Some Global Iraq products remain — check errors in report.");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
