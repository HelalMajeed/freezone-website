/**
 * Red Z only, transparent background — admin + storefront + favicons.
 * Run: node scripts/process-brand-z-logo.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicBrand = path.join(__dirname, "../public/brand");
const BRAND_RED = { r: 201, g: 0, b: 30 }; // #C90000

const sources = [
  path.join(publicBrand, "freezone-z-logo.png"),
  path.join(
    __dirname,
    "../../../.cursor/projects/c-Users-Helal-Desktop-freezone-repo-freezone-website/assets/c__Users_Helal_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_2026-06-02_161806-f2bb2abe-9846-4386-9621-649e1d6b8c1d.png",
  ),
].filter((p) => fs.existsSync(p));

const input = sources[0];
if (!input) {
  console.error("No source logo found");
  process.exit(1);
}

function isMaroonBg(r, g, b) {
  if (r < 90) return false;
  if (g > 95 || b > 95) return false;
  return r > g * 1.35 && r > b * 1.35;
}

function isLightBg(r, g, b) {
  const lum = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return lum > 235 || (lum > 210 && sat < 0.12);
}

function isForeground(r, g, b, a) {
  if (a < 16) return false;
  if (isMaroonBg(r, g, b) || isLightBg(r, g, b)) return false;
  return true;
}

async function buildTransparentZ() {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (isForeground(r, g, b, a) || (isLightBg(r, g, b) && !isMaroonBg(r, g, b))) {
      data[i] = BRAND_RED.r;
      data[i + 1] = BRAND_RED.g;
      data[i + 2] = BRAND_RED.b;
      data[i + 3] = 255;
    } else {
      data[i + 3] = 0;
    }
  }

  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim({ threshold: 10 })
    .toBuffer();
}

const trimmed = await buildTransparentZ();

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

const favicon32 = await sharp(trimmed).resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
await sharp(favicon32).toFile(path.join(__dirname, "../public/favicon.ico"));
console.log("Wrote favicon.ico");
