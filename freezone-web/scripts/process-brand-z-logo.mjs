/**
 * Maroon square + white Z → transparent bg + red Z shape only.
 * Source must be the original asset (not an already-processed PNG).
 * Run: npm run brand:logo
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicBrand = path.join(__dirname, "../public/brand");
const BRAND_RED = { r: 201, g: 0, b: 30 }; // #C90000

const SOURCE_CANDIDATES = [
  path.join(publicBrand, "freezone-z-logo-source.png"),
  path.join(publicBrand, "freezone-z-logo-original.png"),
];

const input = SOURCE_CANDIDATES.find((p) => fs.existsSync(p));
if (!input) {
  console.error(
    "Missing source. Restore once: git checkout 43969c6 -- freezone-web/public/brand/freezone-z-logo.png",
  );
  console.error("Then: copy to public/brand/freezone-z-logo-source.png");
  process.exit(1);
}

/** Square maroon background behind the Z */
function isMaroonBg(r, g, b) {
  if (r < 85) return false;
  if (g > 100 || b > 100) return false;
  return r > g * 1.25 && r > b * 1.25;
}

/** White / light areas = the Z letter (keep and paint red) */
function isZShape(r, g, b) {
  const lum = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (lum > 165 && sat < 0.35) return true;
  if (r > 190 && g > 190 && b > 190) return true;
  return false;
}

/** Already red stroke (if present in source) */
function isRedStroke(r, g, b) {
  return r > 120 && r > g * 1.8 && r > b * 1.8 && g < 90 && b < 90;
}

async function buildRedZOnly() {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let kept = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (isMaroonBg(r, g, b)) {
      data[i + 3] = 0;
      continue;
    }

    if (isZShape(r, g, b) || isRedStroke(r, g, b)) {
      data[i] = BRAND_RED.r;
      data[i + 1] = BRAND_RED.g;
      data[i + 2] = BRAND_RED.b;
      data[i + 3] = 255;
      kept++;
      continue;
    }

    // Soft edge between maroon and white
    const lum = (r + g + b) / 3;
    if (lum > 140 && !isMaroonBg(r, g, b)) {
      data[i] = BRAND_RED.r;
      data[i + 1] = BRAND_RED.g;
      data[i + 2] = BRAND_RED.b;
      data[i + 3] = Math.min(255, Math.round(((lum - 100) / 155) * 255));
      if (data[i + 3] > 32) kept++;
      continue;
    }

    data[i + 3] = 0;
  }

  console.log("Kept pixels (Z shape):", kept, "from", input);

  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim({ threshold: 1 })
    .toBuffer();
}

const trimmed = await buildRedZOnly();

const outputs = [
  path.join(publicBrand, "freezone-z-logo.png"),
  path.join(publicBrand, "site-logo.png"),
  path.join(__dirname, "../public/favicon.png"),
  path.join(__dirname, "../public/apple-touch-icon.png"),
];

for (const out of outputs) {
  const meta = await sharp(trimmed).metadata();
  const maxW = out.includes("favicon") ? 64 : out.includes("apple") ? 180 : 512;
  const scale = Math.min(1, maxW / (meta.width || maxW));
  const w = Math.max(32, Math.round((meta.width || 32) * scale));

  await sharp(trimmed)
    .resize({ width: w, fit: "inside", withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log("Wrote", out);
}

const favicon32 = await sharp(trimmed)
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
await sharp(favicon32).toFile(path.join(__dirname, "../public/favicon.ico"));
console.log("Wrote favicon.ico");
