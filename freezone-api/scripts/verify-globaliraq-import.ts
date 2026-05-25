/**
 * Compare Global Iraq export vs FreeZone DB after import.
 * Writes logs/globaliraq-missing-items.json + logs/globaliraq-full-import-report.json
 */
import dotenv from "dotenv";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import readline from "node:readline";
import { PrismaClient } from "@prisma/client";
import {
  countSourceExport,
  loadCsvMaps,
  type CsvMaps,
} from "./lib/globaliraq-csv.js";

dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.join(process.cwd(), "..", "freezone-web", ".env") });

const prisma = new PrismaClient();

const DEFAULT_EXPORT =
  process.platform === "win32"
    ? "C:\\Users\\Helal\\Downloads\\GlobalIraq_COMPLETE_Recovery_Export"
    : path.join(process.env.HOME ?? "", "Downloads", "GlobalIraq_COMPLETE_Recovery_Export");

const WARRANTY_AR = "ضمان سنتين وكالة";
const PRICE_MARKUP = 1.35;

type ImportRow = { source_handle: string; sku?: string; slug?: string };

function parseArgs(argv: string[]) {
  const i = argv.indexOf("--export-dir");
  return { exportDir: i >= 0 ? argv[i + 1] : DEFAULT_EXPORT };
}

async function* readJsonlHandles(filePath: string): AsyncGenerator<{ handle: string; sku: string; slug: string }> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const row = JSON.parse(trimmed) as ImportRow;
    const handle = row.source_handle?.trim();
    if (!handle) continue;
    yield {
      handle,
      sku: String(row.sku ?? "").trim(),
      slug: String(row.slug ?? "").trim(),
    };
  }
}

async function findProductByHandle(handle: string, sku: string) {
  const byHandle = await prisma.product.findFirst({
    where: { sourceHandle: handle },
    include: { images: true, variants: true },
  });
  if (byHandle) return byHandle;
  const byStorage = await prisma.product.findFirst({
    where: { storage: { startsWith: `globaliraq|${handle}` } },
    include: { images: true, variants: true },
  });
  if (byStorage) return byStorage;
  const skuTrim = sku.trim();
  if (skuTrim && skuTrim !== "—" && skuTrim.length > 2) {
    return prisma.product.findFirst({
      where: { sku: skuTrim },
      include: { images: true, variants: true },
    });
  }
  return null;
}

function specCountFromProduct(specs: unknown): number {
  if (!specs || typeof specs !== "object") return 0;
  return Object.keys(specs as Record<string, unknown>).filter((k) => !k.startsWith("_")).length;
}

async function verify(exportDir: string, csvMaps: CsvMaps, sourceCounts: Awaited<ReturnType<typeof countSourceExport>>) {
  const jsonlPath = path.join(exportDir, "data", "products_import_ready.jsonl");
  const missingProducts: string[] = [];
  const missingImages: { handle: string; expected: number; actual: number; failedFiles: string[] }[] = [];
  const missingSpecs: { handle: string; expected: number; actual: number }[] = [];
  const missingVariants: { handle: string; expected: number; actual: number }[] = [];
  const failedProducts: { handle: string; reason: string }[] = [];

  let importedProducts = 0;
  let importedImages = 0;
  let importedSpecs = 0;
  let importedVariants = 0;

  for await (const { handle, sku } of readJsonlHandles(jsonlPath)) {
    const product = await findProductByHandle(handle, sku);
    if (!product) {
      missingProducts.push(handle);
      continue;
    }
    importedProducts += 1;

    const expectedImgs = csvMaps.images.get(handle)?.length ?? 0;
    const actualImgs = product.images.length;
    importedImages += actualImgs;
    if (expectedImgs > 0 && actualImgs < expectedImgs) {
      const csvRows = csvMaps.images.get(handle) ?? [];
      missingImages.push({
        handle,
        expected: expectedImgs,
        actual: actualImgs,
        failedFiles: csvRows.slice(actualImgs).map((r) => r.localFile),
      });
    }

    const expectedSpecs = csvMaps.specs.get(handle)?.length ?? 0;
    const actualSpecs = specCountFromProduct(product.specs);
    importedSpecs += actualSpecs;
    if (expectedSpecs > 0 && actualSpecs < expectedSpecs) {
      missingSpecs.push({ handle, expected: expectedSpecs, actual: actualSpecs });
    }

    const expectedVars = csvMaps.variants.get(handle)?.length ?? 0;
    const actualVars = product.variants.length;
    importedVariants += actualVars;
    if (expectedVars > 0 && actualVars < expectedVars) {
      missingVariants.push({ handle, expected: expectedVars, actual: actualVars });
    }
  }

  const dbCounts = {
    products: await prisma.product.count({ where: { sourceHandle: { not: null } } }),
    productsLegacy: await prisma.product.count({ where: { storage: { startsWith: "globaliraq|" } } }),
    images: await prisma.productImage.count(),
    variants: await prisma.productVariant.count(),
  };

  const complete =
    missingProducts.length === 0 &&
    missingImages.length === 0 &&
    missingVariants.length === 0;

  const missingItems = {
    generatedAt: new Date().toISOString(),
    exportDir,
    missing_products: missingProducts,
    missing_images: missingImages,
    missing_specs: missingSpecs,
    missing_variants: missingVariants,
    failed_products: failedProducts,
    failed_images: missingImages.flatMap((m) =>
      m.failedFiles.map((f) => ({ handle: m.handle, file: f })),
    ),
    failure_reasons: failedProducts,
    complete,
  };

  const fullReport = {
    source_products_count: sourceCounts.products,
    imported_products_count: importedProducts,
    updated_products_count: 0,
    skipped_products_count: 0,
    failed_products_count: missingProducts.length + failedProducts.length,
    source_images_count: sourceCounts.images,
    imported_images_count: importedImages,
    failed_images_count: missingImages.reduce((s, m) => s + (m.expected - m.actual), 0),
    source_specs_count: sourceCounts.specs,
    imported_specs_count: importedSpecs,
    source_variants_count: sourceCounts.variants,
    imported_variants_count: importedVariants,
    products_without_sku: 0,
    products_without_images: missingImages.length,
    products_without_specs: missingSpecs.length,
    price_markup_applied: PRICE_MARKUP,
    warranty_applied: WARRANTY_AR,
    started_at: null,
    finished_at: new Date().toISOString(),
    duration: null,
    db_totals: dbCounts,
    complete,
    errors: failedProducts,
    sample_product_ids: (
      await prisma.product.findMany({
        where: { sourceHandle: { not: null } },
        take: 5,
        orderBy: { id: "asc" },
        select: { id: true, sourceHandle: true, nameEn: true },
      })
    ).map((p) => ({ id: p.id, handle: p.sourceHandle, name: p.nameEn })),
  };

  const logsDir = path.join(process.cwd(), "logs");
  await mkdir(logsDir, { recursive: true });
  await writeFile(path.join(logsDir, "globaliraq-missing-items.json"), JSON.stringify(missingItems, null, 2), "utf8");
  await writeFile(path.join(logsDir, "globaliraq-full-import-report.json"), JSON.stringify(fullReport, null, 2), "utf8");

  const ar = `# تقرير استيراد Global Iraq — FreeZone

- **التاريخ:** ${new Date().toLocaleString("ar-IQ")}
- **مكتمل 100%:** ${complete ? "نعم ✅" : "لا ❌"}

## الأعداد

| البند | المصدر | المستورد/المرتبط |
|-------|--------|------------------|
| منتجات | ${sourceCounts.products} | ${importedProducts} |
| صور (صفوف CSV) | ${sourceCounts.images} | ${importedImages} |
| مواصفات (صفوف CSV) | ${sourceCounts.specs} | ${importedSpecs} |
| متغيرات | ${sourceCounts.variants} | ${importedVariants} |

## النواقص

- منتجات غير موجودة في DB: **${missingProducts.length}**
- منتجات بصور ناقصة: **${missingImages.length}**
- منتجات بمواصفات ناقصة: **${missingSpecs.length}**
- منتجات بمتغيرات ناقصة: **${missingVariants.length}**

## عينة منتجات للفحص

${fullReport.sample_product_ids.map((p) => `- ID ${p.id}: ${p.name} (\`/ar/product/${p.id}\`)`).join("\n")}

## إصلاح النواقص

\`\`\`powershell
cd freezone-api
npm run import:globaliraq:repair
\`\`\`
`;

  await writeFile(path.join(logsDir, "globaliraq-full-import-report-ar.md"), ar, "utf8");

  console.log(JSON.stringify({ complete, missingProducts: missingProducts.length, missingImages: missingImages.length }, null, 2));
  return { complete, missingItems, fullReport };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!existsSync(path.join(opts.exportDir, "data", "products_import_ready.jsonl"))) {
    console.error("Missing export dir");
    process.exit(1);
  }
  const sourceCounts = await countSourceExport(opts.exportDir);
  const csvMaps = await loadCsvMaps(opts.exportDir);
  const result = await verify(opts.exportDir, csvMaps, sourceCounts);
  process.exit(result.complete ? 0 : 2);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
