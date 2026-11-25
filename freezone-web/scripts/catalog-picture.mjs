/**
 * Make the two pictures the storefront needs for one product, from any photo:
 *
 *   node scripts/catalog-picture.mjs FZ-587 path/to/photo.jpg
 *
 * writes public/catalog/FZ-587.webp (640×640) and public/catalog/s/FZ-587.webp
 * (320×320). The photo is fitted inside a white square, never cropped — product
 * cards blend the picture onto a light grey tile, so a white background is right.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [id, source] = process.argv.slice(2);

if (!/^FZ-\d{3}$/.test(id ?? "") || !source) {
  console.error("usage: node scripts/catalog-picture.mjs FZ-123 path/to/photo");
  process.exit(1);
}

const white = { r: 255, g: 255, b: 255, alpha: 1 };
const out = path.join(ROOT, "public", "catalog");
await mkdir(path.join(out, "s"), { recursive: true });

for (const [size, file] of [
  [640, path.join(out, `${id}.webp`)],
  [320, path.join(out, "s", `${id}.webp`)],
]) {
  await sharp(source)
    .flatten({ background: white })
    .resize(size, size, { fit: "contain", background: white })
    .webp({ quality: 82 })
    .toFile(file);
  console.log(`wrote ${path.relative(ROOT, file)}`);
}
