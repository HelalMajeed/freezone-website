import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WIDTHS = [200, 400, 800, 1600] as const;
const MIN_DIMENSION = 800;
const MAX_BYTES = 5 * 1024 * 1024;

export type ProcessedProductImage = {
  url: string;
  urlW200: string;
  urlW400: string;
  urlW800: string;
  width: number;
  height: number;
};

function uploadsDir(): string {
  return path.join(process.cwd(), "public", "uploads", "products");
}

function publicUrl(filename: string): string {
  return `/uploads/products/${filename}`;
}

/**
 * Validates dimensions (min 800×800), size (max 5MB before processing),
 * writes WebP variants at 200/400/800/1600 widths.
 */
export async function processProductImageUpload(buf: Buffer): Promise<ProcessedProductImage> {
  if (buf.length > MAX_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < MIN_DIMENSION || h < MIN_DIMENSION) {
    throw new Error("IMAGE_TOO_SMALL");
  }

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });

  const out: Record<number, string> = {};
  for (const width of WIDTHS) {
    const filename = `${stamp}-${width}.webp`;
    const fsPath = path.join(dir, filename);
    const resized = await sharp(buf)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    await writeFile(fsPath, resized);
    out[width] = publicUrl(filename);
  }

  return {
    url: out[1600],
    urlW200: out[200],
    urlW400: out[400],
    urlW800: out[800],
    width: w,
    height: h,
  };
}
