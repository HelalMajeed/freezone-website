/**
 * Resize any image to 1200×800 (cover) for category promo cards.
 * Run: node scripts/process-category-promo-image.mjs path/to/image.jpg
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const W = 1200;
const H = 800;

const input = process.argv[2];
if (!input || !fs.existsSync(input)) {
  console.error("Usage: node scripts/process-category-promo-image.mjs <image-file>");
  process.exit(1);
}

const out = process.argv[3] ?? input.replace(/(\.[^.]+)?$/, "-1200x800.jpg");

await sharp(input)
  .resize(W, H, { fit: "cover", position: "centre" })
  .jpeg({ quality: 88 })
  .toFile(out);

console.log("Wrote", path.resolve(out), `${W}×${H}`);
