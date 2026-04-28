/**
 * One-off: remove near-white background, trim, upscale for header display.
 * Run: node scripts/process-site-logo.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.join(__dirname, "../public/brand/site-logo.png");
const tmpPath = path.join(__dirname, "../public/brand/site-logo.new.png");

function isBackgroundPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = (r + g + b) / 3;
  if (lum > 248) return true;
  if (r > 245 && g > 245 && b > 245) return true;
  if (lum > 232 && sat < 0.1) return true;
  return false;
}

const { data, info } = await sharp(logoPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const w = info.width;
const h = info.height;

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (isBackgroundPixel(r, g, b)) {
    data[i + 3] = 0;
  }
}

const trimmed = await sharp(data, {
  raw: { width: w, height: h, channels: 4 },
})
  .png()
  .trim({ threshold: 8 })
  .toBuffer();

const meta = await sharp(trimmed).metadata();
const targetWidth = Math.min(720, Math.max(520, Math.round((meta.width ?? 400) * 1.35)));

await sharp(trimmed)
  .resize({
    width: targetWidth,
    fit: "inside",
    withoutEnlargement: false,
    kernel: sharp.kernel.lanczos3,
  })
  .png({ compressionLevel: 9 })
  .toFile(tmpPath);

fs.renameSync(tmpPath, logoPath);

console.log("Wrote", logoPath, "→", targetWidth, "px wide (was", meta.width, "trimmed)");
