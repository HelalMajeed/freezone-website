/**
 * Global Iraq → FreeZone product import (idempotent, Prisma direct).
 *
 * @see docs/GLOBALIRAQ_IMPORT_README.md
 */
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.join(process.cwd(), "..", "freezone-web", ".env") });

import { createHash } from "node:crypto";
import { createReadStream, existsSync, readdirSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import readline from "node:readline";
import { PrismaClient } from "@prisma/client";
import { detectImageExt } from "../src/lib/image-magic.js";
import { loadCsvMaps, countSourceExport } from "./lib/globaliraq-csv.js";

const prisma = new PrismaClient();

const DEFAULT_EXPORT =
  process.platform === "win32"
    ? "C:\\Users\\Helal\\Downloads\\GlobalIraq_COMPLETE_Recovery_Export"
    : path.join(process.env.HOME ?? "", "Downloads", "GlobalIraq_COMPLETE_Recovery_Export");

const WARRANTY_AR = "ضمان سنتين وكالة";
const PRICE_MARKUP = 1.35;

type ImportRow = {
  source_handle: string;
  source_url?: string;
  title: string;
  slug?: string;
  sku?: string;
  model?: string;
  brand?: string;
  category?: string;
  tags?: string;
  original_price?: number;
  price?: number;
  price_exact_before_rounding?: number;
  currency?: string;
  warranty?: string;
  description_html?: string;
  description_text?: string;
  full_details?: string;
  main_image_url?: string;
  image_urls?: string;
  local_image_files?: string;
  specifications?: string;
  variants?: string;
};

type ImageCsvRow = { position: number; localFile: string; url: string; isMain: boolean };
type SpecCsvRow = { key: string; value: string };
type VariantCsvRow = {
  position: number;
  variantId: string;
  title: string;
  sku: string;
  option1: string;
  option2: string;
  option3: string;
  originalPrice: number;
  priceRounded: number;
  available: boolean;
  rawJson: string;
};

type Report = {
  startedAt: string;
  finishedAt: string;
  exportDir: string;
  limit: number | null;
  dryRun: boolean;
  update: boolean;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  imagesCopied: number;
  imagesFailed: number;
  productsWithoutSku: number;
  productsWithoutImages: number;
  productsWithoutSpecs: number;
  errors: { handle: string; message: string }[];
  imageFailures: { handle: string; file: string; reason: string }[];
  samples: { handle: string; id?: number; action: string }[];
};

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    exportDir: get("--export-dir") ?? DEFAULT_EXPORT,
    limit: get("--limit") ? Number(get("--limit")) : undefined,
    dryRun: argv.includes("--dry-run"),
    update: argv.includes("--update"),
    skipImages: argv.includes("--skip-images"),
    verify: !argv.includes("--no-verify"),
    handles: get("--handles")?.split(",").map((h) => h.trim()).filter(Boolean),
  };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "brand"
  );
}

function storageRef(handle: string, sourceUrl?: string): string {
  const url = (sourceUrl ?? "").trim();
  return url ? `globaliraq|${handle}|${url}` : `globaliraq|${handle}`;
}

function parseStorageRef(storage: string): { handle?: string; url?: string } {
  if (!storage.startsWith("globaliraq|")) return {};
  const parts = storage.split("|");
  return { handle: parts[1], url: parts[2] };
}

function parseJsonArrayField(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseJsonObjectField(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function resolveLocalPath(exportDir: string, rel: string): string {
  const cleaned = rel.replace(/^\.\//, "").replace(/\\/g, path.sep);
  return path.isAbsolute(cleaned) ? cleaned : path.join(exportDir, cleaned);
}

/** CSV paths sometimes truncate folder names vs source_handle — resolve by basename + fuzzy folder. */
function resolveImageFile(exportDir: string, handle: string, rel: string): string {
  const base = path.basename(rel.replace(/\\/g, path.sep));
  const csvFolder = path.basename(path.dirname(rel.replace(/\\/g, path.sep)));
  const imgRoot = path.join(exportDir, "images_all");
  const candidates = [
    resolveLocalPath(exportDir, rel),
    path.join(imgRoot, handle, base),
    path.join(imgRoot, csvFolder, base),
    path.join(imgRoot, handle.replace(/-(black|white|silver|grey|cloud-grey)$/i, ""), base),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  if (existsSync(imgRoot)) {
    const needle = handle.slice(0, Math.min(48, handle.length)).toLowerCase();
    for (const dir of readdirSync(imgRoot, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const dn = dir.name.toLowerCase();
      if (dn.includes(needle.slice(0, 32)) || needle.includes(dn.slice(0, 32))) {
        const p = path.join(imgRoot, dir.name, base);
        if (existsSync(p)) return p;
      }
    }
  }
  return candidates[0];
}

function roundIqd(n: number): number {
  return Math.max(1, Math.round(n));
}

function computePrice(row: ImportRow): { price: number; oldPrice: number | null; originalPrice: number | null } {
  const original = row.original_price != null ? Number(row.original_price) : null;
  let price = row.price != null ? Number(row.price) : NaN;
  if (!Number.isFinite(price) || price <= 0) {
    if (original != null && original > 0) price = roundIqd(original * PRICE_MARKUP);
    else price = 1;
  } else {
    price = roundIqd(price);
  }
  const originalPrice = original != null && original > 0 ? roundIqd(original) : null;
  return { price, oldPrice: null, originalPrice };
}

function ensureWarrantyInHtml(html: string, warranty: string): string {
  const w = warranty.trim() || WARRANTY_AR;
  if (html.includes(w) || html.includes("الضمان:")) return html;
  return `${html}\n<p><strong>الضمان:</strong> ${w}</p>`;
}

function buildSpecsTableHtml(specs: Record<string, string>): string {
  const entries = Object.entries(specs).filter(([k]) => !k.startsWith("_"));
  if (!entries.length) return "";
  const rows = entries
    .map(
      ([k, v]) =>
        `<tr><th style="text-align:start;padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(k)}</th><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  return `<h3>المواصفات</h3><table style="width:100%;border-collapse:collapse;margin:12px 0"><tbody>${rows}</tbody></table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mapCategorySlug(sourceCategory: string, title: string): string {
  const c = (sourceCategory ?? "").trim().toLowerCase();
  const t = title.toLowerCase();
  const hay = `${c} ${t}`;
  const rules: Array<[RegExp, string]> = [
    [/gaming laptop|portable gaming|nitro|predator|rog strix|legion|tuf gaming/i, "laptops"],
    [/office laptop|^laptops$|thinkpad|latitude|elitebook|vivobook|ideapad/i, "laptops"],
    [/all in one|all-in-one|aspire c24/i, "all-in-one"],
    [/gaming monitor|office monitor|designer monitor|monitor accessory|144hz|165hz|240hz/i, "monitors"],
    [/television|televisions|data show|streaming/i, "monitors"],
    [/inkjet|laser printer|scanner|paper shredder|3d printer/i, "printers"],
    [/security camera|cctv|dash cam|nvr|dvr|gps tracking/i, "cctv"],
    [/security bundle|smart lock|air purifier|robot vacuum/i, "smart-home"],
    [/ups|line interactive|online ups|nano dc/i, "power-solutions"],
    [/tablet|ipad|drawing tablet|signature pad/i, "tablets"],
    [/phone|iphone|galaxy s|smartphone/i, "phones"],
    [/server|ops barebone/i, "computers"],
    [/desktop computer|desktop system|barebone|imac|mac mini|mac studio/i, "computers"],
    [/liquid cooler|air cooler|gas cooler|thermal paste|thermal pad|fan kit|aio/i, "components"],
    [/memory|nvme|ssd|hdd|ram|ddr4|ddr5|m\.2/i, "components"],
    [/processor|ryzen|intel ultra|intel 1[0-9]|b760|b860|z890|x870|b650|b850|5090|5080|5070|5060|3050|3060/i, "components"],
    [/mid-tower|full-tower|m-atx|case|mounting kit/i, "components"],
    [/1000w|850w|750w|650w|700w|800w|1200w|1250w|psu|power supply/i, "components"],
    [/mechanical keyboard|magnetic keyboard|office keyboard|keyboard|wrist rest|ipad keyboard/i, "accessories"],
    [/wireless mouse|wired mouse|gaming mouse|office mouse|trackball/i, "accessories"],
    [/headset|headphone|speaker|microphone|webcam|neck microphone/i, "accessories"],
    [/backpack|chair|laptop stand|tv & monitor mount|mount/i, "accessories"],
    [/cable|ethernet|adapter|hub switch|router|wi-fi|wifi extender/i, "accessories"],
    [/temp monitor|software|operating system|windows/i, "accessories"],
    [/controller|gaming pad/i, "gaming"],
    [/electric|tools|pens|laser pointer/i, "electric"],
    [/hardware|arduino|raspberry|dev board/i, "hardware"],
  ];
  for (const [re, slug] of rules) {
    if (re.test(hay)) return slug;
  }
  if (/laptop/i.test(hay)) return "laptops";
  if (/monitor|display/i.test(hay)) return "monitors";
  if (/printer/i.test(hay)) return "printers";
  if (/game|gaming|rtx|gtx/i.test(hay)) return "gaming";
  return "accessories";
}

function uploadsProductsDir(): string {
  const now = new Date();
  const y = String(now.getUTCFullYear());
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return path.join(process.cwd(), "public", "uploads", "products", y, m);
}

function publicUrlForFile(relFromUploads: string): string {
  return `/uploads/${relFromUploads.replace(/\\/g, "/")}`;
}

async function copyLocalImage(absPath: string, productId: number, retries = 3): Promise<string | null> {
  if (!existsSync(absPath)) return null;
  let buf: Buffer | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      buf = await readFile(absPath);
      break;
    } catch {
      if (attempt === retries) return null;
      await new Promise((r) => setTimeout(r, 150 * attempt));
    }
  }
  if (!buf) return null;
  let ext = detectImageExt(buf);
  if (!ext) {
    const lower = absPath.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) ext = ".jpg";
    else if (lower.endsWith(".png")) ext = ".png";
    else if (lower.endsWith(".webp")) ext = ".webp";
    else if (lower.endsWith(".gif")) ext = ".gif";
    else if (buf.length > 0) ext = ".jpg";
  }
  if (!ext) return null;
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 12);
  const filename = `gi-${productId}-${Date.now()}-${hash}${ext}`;
  const dir = uploadsProductsDir();
  await mkdir(dir, { recursive: true });
  const fsPath = path.join(dir, filename);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await copyFile(absPath, fsPath);
      const rel = path.relative(path.join(process.cwd(), "public", "uploads"), fsPath);
      return publicUrlForFile(rel);
    } catch {
      try {
        await writeFile(fsPath, buf);
        const rel = path.relative(path.join(process.cwd(), "public", "uploads"), fsPath);
        return publicUrlForFile(rel);
      } catch {
        if (attempt === retries) return null;
        await new Promise((r) => setTimeout(r, 150 * attempt));
      }
    }
  }
  return null;
}

async function findOrCreateBrand(name: string): Promise<{ id: number; nameEn: string } | null> {
  const n = name.trim();
  if (!n || n === "—") return null;
  const existing = await prisma.brand.findFirst({
    where: { nameEn: { equals: n, mode: "insensitive" } },
  });
  if (existing) return { id: existing.id, nameEn: existing.nameEn };
  let slug = slugify(n);
  let suffix = 0;
  while (await prisma.brand.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${slugify(n)}-${suffix}`;
  }
  const created = await prisma.brand.create({
    data: { slug, nameEn: n, nameAr: n, sortOrder: 0, active: true },
  });
  return { id: created.id, nameEn: created.nameEn };
}

async function loadCategoryMap(): Promise<Map<string, number>> {
  const rows = await prisma.category.findMany({ select: { id: true, slug: true } });
  return new Map(rows.map((r) => [r.slug, r.id]));
}

async function findExistingProduct(handle: string) {
  const include = { images: { orderBy: { sortOrder: "asc" as const } }, variants: true };
  const byHandle = await prisma.product.findFirst({
    where: { sourceHandle: handle },
    include,
  });
  if (byHandle) return byHandle;
  return prisma.product.findFirst({
    where: { storage: { startsWith: `globaliraq|${handle}` } },
    include,
  });
}

function collectImagePaths(
  handle: string,
  row: ImportRow,
  imageMap: Map<string, ImageCsvRow[]>,
  exportDir: string,
): { paths: string[]; mainUrl?: string } {
  const csvRows = imageMap.get(handle) ?? [];
  const fromCsv = csvRows.map((r) => r.localFile).filter(Boolean);
  const fromJson = parseJsonArrayField(row.local_image_files);
  const merged = [...fromCsv, ...fromJson];
  const paths = [...new Set(merged.map((p) => resolveImageFile(exportDir, handle, p)))].filter((p) =>
    existsSync(p),
  );
  const mainUrl = csvRows.find((r) => r.isMain)?.url ?? row.main_image_url;
  return { paths, mainUrl };
}

function buildSpecsRecord(
  handle: string,
  row: ImportRow,
  specMap: Map<string, SpecCsvRow[]>,
  variantItems: VariantCsvRow[],
): Record<string, string> {
  const out: Record<string, string> = {};
  const csvSpecs = specMap.get(handle) ?? [];
  for (const s of csvSpecs) {
    const k = s.key.trim();
    const v = s.value.trim();
    if (k && v) out[k] = v;
  }
  const jsonSpecs = parseJsonObjectField(row.specifications);
  for (const [k, v] of Object.entries(jsonSpecs)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  out._warranty = (row.warranty ?? WARRANTY_AR).trim() || WARRANTY_AR;
  out.warranty = out._warranty;
  out._source_handle = handle;
  if (row.source_url) out._source_url = row.source_url;
  if (row.slug?.trim()) out._slug = row.slug.trim();
  if (variantItems.length) {
    out._variants_json = JSON.stringify(
      variantItems.map((v) => ({
        sku: v.sku,
        title: v.title,
        option1: v.option1,
        option2: v.option2,
        option3: v.option3,
        price: v.priceRounded,
        available: v.available,
      })),
    );
  }
  return out;
}

function variantLabel(v: VariantCsvRow): string {
  const opts = [v.option1, v.option2, v.option3].filter(Boolean);
  if (v.title?.trim()) return v.title.trim();
  if (opts.length) return opts.join(" / ");
  return "Default";
}

async function syncVariants(
  productId: number,
  handle: string,
  row: ImportRow,
  variantMap: Map<string, VariantCsvRow[]>,
  update: boolean,
) {
  const csvVariants = variantMap.get(handle) ?? [];
  let items: VariantCsvRow[] = csvVariants;

  if (!items.length && row.variants) {
    try {
      const parsed = JSON.parse(row.variants) as Array<Record<string, unknown>>;
      items = parsed.map((v, i) => ({
        position: i + 1,
        variantId: String(v.id ?? ""),
        title: String(v.title ?? v.option1 ?? "Default"),
        sku: String(v.sku ?? row.sku ?? ""),
        option1: String(v.option1 ?? v.title ?? ""),
        option2: String(v.option2 ?? ""),
        option3: String(v.option3 ?? ""),
        originalPrice: Number(v.price) || 0,
        priceRounded: roundIqd((Number(v.price) || 0) * PRICE_MARKUP),
        available: v.available !== false,
        rawJson: JSON.stringify(v),
      }));
    } catch {
      /* ignore */
    }
  }

  if (!items.length) return;

  const existingCount = await prisma.productVariant.count({ where: { productId } });
  if (existingCount > 0 && !update) return;

  if (update && existingCount > 0) await prisma.productVariant.deleteMany({ where: { productId } });

  let order = 0;
  for (const v of items) {
    const label = variantLabel(v);
    await prisma.productVariant.create({
      data: {
        productId,
        sku: v.sku || String(row.sku ?? ""),
        labelEn: label,
        labelAr: label,
        priceOverride: v.priceRounded > 0 ? v.priceRounded : null,
        quantity: v.available ? 1 : 0,
        active: v.available,
        sortOrder: order++,
      },
    });
  }
}

async function syncImages(
  productId: number,
  handle: string,
  paths: string[],
  mainUrl: string | undefined,
  report: Report,
) {
  if (!paths.length) {
    report.productsWithoutImages += 1;
    return;
  }
  await prisma.productImage.deleteMany({ where: { productId } });
  let order = 0;
  for (const abs of paths) {
    const url = await copyLocalImage(abs, productId);
    if (!url) {
      report.imagesFailed += 1;
      report.imageFailures.push({
        handle,
        file: abs,
        reason: existsSync(abs) ? "copy_failed" : "file_missing",
      });
      continue;
    }
    await prisma.productImage.create({
      data: {
        productId,
        url,
        sortOrder: order++,
        originalSourceUrl: order === 1 ? mainUrl ?? null : null,
      },
    });
    report.imagesCopied += 1;
  }
}

async function upsertOne(
  row: ImportRow,
  exportDir: string,
  categoryMap: Map<string, number>,
  csvMaps: Awaited<ReturnType<typeof loadCsvMaps>>,
  opts: ReturnType<typeof parseArgs>,
  report: Report,
) {
  const handle = row.source_handle?.trim();
  const title = row.title?.trim();
  if (!handle || !title) {
    report.failed += 1;
    report.errors.push({ handle: handle ?? "?", message: "missing handle or title" });
    return;
  }

  const sku = String(row.sku ?? "").trim();
  if (!sku || sku === "—") report.productsWithoutSku += 1;

  const slug = mapCategorySlug(row.category ?? "", title);
  const categoryId = categoryMap.get(slug) ?? categoryMap.get("accessories");
  if (!categoryId && !opts.dryRun) {
    report.failed += 1;
    report.errors.push({ handle, message: `unknown category slug ${slug}` });
    return;
  }

  const { price, oldPrice, originalPrice } = computePrice(row);
  const warranty = (row.warranty ?? WARRANTY_AR).trim() || WARRANTY_AR;
  const csvVariants = csvMaps.variants.get(handle) ?? [];
  const specsRecord = buildSpecsRecord(handle, row, csvMaps.specs, csvVariants);
  if (!Object.keys(specsRecord).filter((k) => !k.startsWith("_")).length) {
    report.productsWithoutSpecs += 1;
  }
  const specsTable = buildSpecsTableHtml(specsRecord);

  let descHtml = row.description_html?.trim() || row.description_text?.trim() || "";
  if (row.full_details?.trim() && !descHtml.includes(row.full_details.slice(0, 40))) {
    descHtml += `\n<h3>تفاصيل إضافية</h3><pre>${escapeHtml(row.full_details.trim())}</pre>`;
  }
  descHtml = ensureWarrantyInHtml(descHtml, warranty);
  if (specsTable && !descHtml.includes("المواصفات")) descHtml += `\n${specsTable}`;

  const brand = opts.dryRun ? null : await findOrCreateBrand(row.brand ?? "");
  const { paths, mainUrl } = collectImagePaths(handle, row, csvMaps.images, exportDir);

  const existing = opts.dryRun ? null : await findExistingProduct(handle);

  const importedAt = new Date();
  const specsPayload = {
    ...specsRecord,
    _import: {
      source_handle: handle,
      source_url: row.source_url ?? null,
      slug: row.slug ?? null,
      imported_at: importedAt.toISOString(),
      warranty,
    },
  };

  const payload = {
    categoryId: categoryId ?? 0,
    brand: (brand?.nameEn ?? row.brand ?? "").trim() || "—",
    brandId: brand?.id ?? null,
    sku: sku || "—",
    model: String(row.model ?? sku ?? "").trim().slice(0, 120),
    quantity: 1,
    nameEn: title.slice(0, 500),
    nameAr: title.slice(0, 500),
    descEn: descHtml,
    descAr: descHtml,
    price,
    oldPrice,
    originalPrice,
    warranty,
    sourceHandle: handle,
    sourceUrl: row.source_url?.trim() || null,
    importedAt,
    storage: storageRef(handle, row.source_url),
    inStock: true,
    published: true,
    specs: specsPayload as object,
  };

  if (opts.dryRun) {
    console.log(
      `[dry-run] ${existing ? "skip/update" : "import"} ${handle} → ${slug} | ${title.slice(0, 50)}… | ${paths.length} imgs`,
    );
    report.samples.push({ handle, action: existing ? "would-skip-or-update" : "would-import" });
    if (existing) report.skipped += 1;
    else report.imported += 1;
    return;
  }

  try {
    if (existing) {
      if (!opts.update) {
        report.skipped += 1;
        report.samples.push({ handle, id: existing.id, action: "skipped" });
        return;
      }
      await prisma.product.update({ where: { id: existing.id }, data: payload });
      if (!opts.skipImages && (!existing.images.length || opts.update)) {
        await syncImages(existing.id, handle, paths, mainUrl, report);
      }
      await syncVariants(existing.id, handle, row, csvMaps.variants, true);
      report.updated += 1;
      report.samples.push({ handle, id: existing.id, action: "updated" });
      return;
    }

    const created = await prisma.product.create({ data: payload });
    if (!opts.skipImages) await syncImages(created.id, handle, paths, mainUrl, report);
    await syncVariants(created.id, handle, row, csvMaps.variants, false);
    report.imported += 1;
    report.samples.push({ handle, id: created.id, action: "imported" });
  } catch (e) {
    report.failed += 1;
    const msg = e instanceof Error ? e.message : String(e);
    report.errors.push({ handle, message: msg });
    console.error(`FAIL ${handle}: ${msg}`);
  }
}

async function* readJsonl(filePath: string): AsyncGenerator<ImportRow> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    yield JSON.parse(trimmed) as ImportRow;
  }
}

async function saveReport(report: Report, exportDir: string) {
  const logsDir = path.join(process.cwd(), "logs");
  await mkdir(logsDir, { recursive: true });
  const outPath = path.join(logsDir, "globaliraq-import-report.json");
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport saved: ${outPath}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const jsonlPath = path.join(opts.exportDir, "data", "products_import_ready.jsonl");

  if (!existsSync(jsonlPath)) {
    console.error(`Missing: ${jsonlPath}`);
    process.exit(1);
  }

  const report: Report = {
    startedAt: new Date().toISOString(),
    finishedAt: "",
    exportDir: opts.exportDir,
    limit: opts.limit ?? null,
    dryRun: opts.dryRun,
    update: opts.update,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    imagesCopied: 0,
    imagesFailed: 0,
    productsWithoutSku: 0,
    productsWithoutImages: 0,
    productsWithoutSpecs: 0,
    errors: [],
    imageFailures: [],
    samples: [],
  };

  console.log("Global Iraq → FreeZone import");
  console.log(`  export: ${opts.exportDir}`);
  console.log(`  limit: ${opts.limit ?? "all"}`);
  console.log(`  dry-run: ${opts.dryRun}`);
  console.log(`  update: ${opts.update}`);
  console.log("");

  if (!opts.dryRun) {
    try {
      await prisma.category.count();
    } catch (e) {
      console.error(
        "\n❌ DATABASE_URL غير صالح أو PostgreSQL غير شغّال.\n" +
          "   ضع DATABASE_URL في freezone-api/.env و freezone-web/.env\n" +
          '   مثال: postgresql://freezone:freezone_dev@localhost:5432/freezone\n' +
          "   أو: npm run db:local / pg:cluster:start من freezone-web\n",
      );
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    }
  }

  const categoryMap = opts.dryRun ? new Map<string, number>() : await loadCategoryMap();
  if (!opts.dryRun && !categoryMap.size) {
    console.error("No categories in DB. Run migrations (categories must exist — not full product seed wipe).");
    process.exit(1);
  }

  const csvMaps = await loadCsvMaps(opts.exportDir);
  console.log(
    `Loaded CSV indexes: images=${csvMaps.images.size} handles, specs=${csvMaps.specs.size}, variants=${csvMaps.variants.size}`,
  );

  let n = 0;
  for await (const row of readJsonl(jsonlPath)) {
    if (opts.limit != null && n >= opts.limit) break;
    const handle = row.source_handle?.trim();
    if (opts.handles?.length && handle && !opts.handles.includes(handle)) continue;
    n += 1;
    await upsertOne(row, opts.exportDir, categoryMap, csvMaps, opts, report);
    if (n % 25 === 0) {
      console.log(`… ${n} processed (imported ${report.imported}, skipped ${report.skipped}, failed ${report.failed})`);
    }
  }

  report.finishedAt = new Date().toISOString();

  console.log("\n=== Import report ===");
  console.log(`processed:           ${n}`);
  console.log(`imported:            ${report.imported}`);
  console.log(`updated:             ${report.updated}`);
  console.log(`skipped:             ${report.skipped}`);
  console.log(`failed:              ${report.failed}`);
  console.log(`images copied:       ${report.imagesCopied}`);
  console.log(`images failed:       ${report.imagesFailed}`);
  console.log(`without SKU:         ${report.productsWithoutSku}`);
  console.log(`without images:      ${report.productsWithoutImages}`);
  console.log(`without specs:       ${report.productsWithoutSpecs}`);
  if (report.errors.length) {
    console.log(`errors (first 5):    ${report.errors.slice(0, 5).map((e) => e.handle).join(", ")}`);
  }

  await saveReport(report, opts.exportDir);

  if (!opts.dryRun && opts.verify) {
    console.log("\nRunning post-import verification…");
    const { spawnSync } = await import("node:child_process");
    const verify = spawnSync(
      "npx",
      ["tsx", "scripts/verify-globaliraq-import.ts", "--export-dir", opts.exportDir],
      { cwd: process.cwd(), stdio: "inherit", shell: true, env: process.env },
    );
    if (verify.status === 2) {
      console.log("\n⚠️  Verification found gaps — run: npm run import:globaliraq:repair");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
