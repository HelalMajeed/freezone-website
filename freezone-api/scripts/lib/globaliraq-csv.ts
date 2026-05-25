import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type ImageCsvRow = { position: number; localFile: string; url: string; isMain: boolean };
export type SpecCsvRow = { key: string; value: string };
export type VariantCsvRow = {
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

export type CsvMaps = {
  images: Map<string, ImageCsvRow[]>;
  specs: Map<string, SpecCsvRow[]>;
  variants: Map<string, VariantCsvRow[]>;
};

export type SourceCounts = {
  products: number;
  images: number;
  specs: number;
  variants: number;
  imageFiles: number;
};

/** Minimal RFC4180-ish CSV line parser (handles quoted fields). */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export async function loadCsvMaps(exportDir: string): Promise<CsvMaps> {
  const images = new Map<string, ImageCsvRow[]>();
  const specs = new Map<string, SpecCsvRow[]>();
  const variants = new Map<string, VariantCsvRow[]>();

  const imagesPath = path.join(exportDir, "data", "images.csv");
  if (existsSync(imagesPath)) {
    const raw = await readFile(imagesPath, "utf8");
    for (const line of raw.split(/\r?\n/).slice(1)) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      if (cols.length < 6) continue;
      const handle = cols[0];
      const row: ImageCsvRow = {
        position: Number(cols[2]) || 0,
        url: cols[3] ?? "",
        localFile: cols[4] ?? "",
        isMain: (cols[5] ?? "").toUpperCase() === "YES",
      };
      if (!images.has(handle)) images.set(handle, []);
      images.get(handle)!.push(row);
    }
    for (const arr of images.values()) arr.sort((a, b) => a.position - b.position);
  }

  const specsPath = path.join(exportDir, "data", "specs.csv");
  if (existsSync(specsPath)) {
    const raw = await readFile(specsPath, "utf8");
    for (const line of raw.split(/\r?\n/).slice(1)) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      if (cols.length < 5) continue;
      const handle = cols[0];
      const row: SpecCsvRow = { key: cols[3] ?? "", value: cols[4] ?? "" };
      if (!row.key.trim()) continue;
      if (!specs.has(handle)) specs.set(handle, []);
      specs.get(handle)!.push(row);
    }
  }

  const variantsPath = path.join(exportDir, "data", "variants.csv");
  if (existsSync(variantsPath)) {
    const raw = await readFile(variantsPath, "utf8");
    for (const line of raw.split(/\r?\n/).slice(1)) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      if (cols.length < 10) continue;
      const handle = cols[0];
      const row: VariantCsvRow = {
        position: Number(cols[2]) || 0,
        variantId: cols[3] ?? "",
        title: cols[4] ?? "",
        sku: cols[5] ?? "",
        option1: cols[6] ?? "",
        option2: cols[7] ?? "",
        option3: cols[8] ?? "",
        originalPrice: Number(cols[9]) || 0,
        priceRounded: Number(cols[10]) || 0,
        available: (cols[11] ?? "").toLowerCase() === "true",
        rawJson: cols[cols.length - 1] ?? "",
      };
      if (!variants.has(handle)) variants.set(handle, []);
      variants.get(handle)!.push(row);
    }
    for (const arr of variants.values()) arr.sort((a, b) => a.position - b.position);
  }

  return { images, specs, variants };
}

export async function countSourceExport(exportDir: string): Promise<SourceCounts> {
  const { readdir, readFile } = await import("node:fs/promises");
  const jsonlPath = path.join(exportDir, "data", "products_import_ready.jsonl");
  let products = 0;
  if (existsSync(jsonlPath)) {
    const raw = await readFile(jsonlPath, "utf8");
    products = raw.split(/\r?\n/).filter((l) => l.trim()).length;
  }
  const csv = await loadCsvMaps(exportDir);
  let imageRows = 0;
  for (const arr of csv.images.values()) imageRows += arr.length;
  let specRows = 0;
  for (const arr of csv.specs.values()) specRows += arr.length;
  let variantRows = 0;
  for (const arr of csv.variants.values()) variantRows += arr.length;

  let imageFiles = 0;
  const imgRoot = path.join(exportDir, "images_all");
  if (existsSync(imgRoot)) {
    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) await walk(p);
        else imageFiles += 1;
      }
    }
    await walk(imgRoot);
  }

  return { products, images: imageRows, specs: specRows, variants: variantRows, imageFiles };
}
