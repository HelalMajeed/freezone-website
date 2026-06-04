/**
 * Red Z mark on white → transparent bg, red shape only (high-res exports).
 * Source: public/brand/freezone-z-logo-source.png (original raster, not processed).
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
  console.error("Missing source. Add public/brand/freezone-z-logo-source.png");
  process.exit(1);
}

/** Maroon / red strokes = the Z logo (keep) */
function isRedLogo(r, g, b) {
  if (r < 70) return false;
  if (g > 115 || b > 115) return false;
  return r > g * 1.15 && r > b * 1.15;
}

/** White / light = background and internal cutouts (remove) */
function isWhiteArea(r, g, b) {
  const lum = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (lum > 200 && sat < 0.28) return true;
  if (r > 175 && g > 175 && b > 175) return true;
  return false;
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

    if (isRedLogo(r, g, b)) {
      data[i] = BRAND_RED.r;
      data[i + 1] = BRAND_RED.g;
      data[i + 2] = BRAND_RED.b;
      data[i + 3] = 255;
      kept++;
      continue;
    }

    if (isWhiteArea(r, g, b)) {
      data[i + 3] = 0;
      continue;
    }

    // Anti-aliased edge between red and white
    const lum = (r + g + b) / 3;
    if (lum < 200 && isRedLogo(r, g, b) === false && r > g && r > b) {
      const redness = Math.min(1, (r - Math.max(g, b)) / 80);
      const alpha = Math.round(redness * 255);
      if (alpha > 24) {
        data[i] = BRAND_RED.r;
        data[i + 1] = BRAND_RED.g;
        data[i + 2] = BRAND_RED.b;
        data[i + 3] = alpha;
        kept++;
        continue;
      }
    }

    data[i + 3] = 0;
  }

  console.log("Kept pixels (red Z):", kept, "from", input, `(${w}×${h})`);

  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim({ threshold: 1 })
    .toBuffer();
}

const trimmed = await buildRedZOnly();
const meta = await sharp(trimmed).metadata();
const longEdge = Math.max(meta.width || 1, meta.height || 1);
/** Master asset: up to 2048px on longest side (Lanczos upscale from source). */
const MASTER_MAX = 2048;
const masterScale = MASTER_MAX / longEdge;
const masterW = Math.round((meta.width || 1) * masterScale);
const masterH = Math.round((meta.height || 1) * masterScale);

const masterPng = await sharp(trimmed)
  .resize(masterW, masterH, {
    fit: "inside",
    kernel: sharp.kernel.lanczos3,
    withoutEnlargement: false,
  })
  .png({ compressionLevel: 9 })
  .toBuffer();

const outputs = [
  { path: path.join(publicBrand, "freezone-z-logo.png"), max: masterW },
  { path: path.join(publicBrand, "freezone-z-logo@2x.png"), max: masterW },
  { path: path.join(publicBrand, "site-logo.png"), max: Math.min(1024, masterW) },
  { path: path.join(__dirname, "../public/favicon.png"), max: 128 },
  { path: path.join(__dirname, "../public/apple-touch-icon.png"), max: 180 },
];

for (const { path: out, max } of outputs) {
  await sharp(masterPng)
    .resize({ width: max, fit: "inside", withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(out);
  const m = await sharp(out).metadata();
  console.log("Wrote", out, `→ ${m.width}×${m.height}`);
}

const favicon32 = await sharp(masterPng)
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
await sharp(favicon32).toFile(path.join(__dirname, "../public/favicon.ico"));
console.log("Wrote favicon.ico");
