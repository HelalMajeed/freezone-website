/** Laptop filter token extractors — short values only, never marketing blobs. */

export const LAPTOP_SCREEN_INCH_MIN = 10;
export const LAPTOP_SCREEN_INCH_MAX = 20;

export function isValidLaptopScreenInch(n: number): boolean {
  return Number.isFinite(n) && n >= LAPTOP_SCREEN_INCH_MIN && n <= LAPTOP_SCREEN_INCH_MAX;
}

/** Extract diagonal inches (10–20) from product text; ignores resolution WxH and Hz. */
export function extractScreenSizeInches(text: string): string | undefined {
  const s = text.trim();
  if (!s) return undefined;

  const candidates: number[] = [];

  const inchPatterns = [
    /(\d{1,2}(?:\.\d)?)\s*(?:[-\s]*)?(?:inch|inches|")\b/gi,
    /\b(\d{1,2}(?:\.\d)?)\s*Inch\b/g,
    /\b(\d{1,2}(?:\.\d)?)\s*inch\b/gi,
  ];
  for (const re of inchPatterns) {
    for (const m of s.matchAll(re)) {
      const n = parseFloat(m[1]);
      if (isValidLaptopScreenInch(n)) candidates.push(n);
    }
  }

  // "15.6 Inch FHD" style in titles (Inch capitalized after number)
  for (const m of s.matchAll(/\b(\d{1,2}(?:\.\d)?)\s+Inch\b/g)) {
    const n = parseFloat(m[1]);
    if (isValidLaptopScreenInch(n)) candidates.push(n);
  }

  if (!candidates.length) return undefined;
  // Prefer the value that appears with "inch" context; use max plausible laptop size if multiple
  const best = candidates.sort((a, b) => b - a)[0];
  const out = Number.isInteger(best) ? String(best) : String(best);
  return isValidLaptopScreenInch(parseFloat(out)) ? out : undefined;
}

/** Reject concatenated junk like 1625601600240 (merged resolution + Hz digits). */
export function sanitizeStoredScreenSize(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const t = raw.trim();
  if (/x\d/i.test(t) || t.length > 6) return extractScreenSizeInches(t);
  const n = parseFloat(t.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return undefined;
  if (!isValidLaptopScreenInch(n)) return undefined;
  return Number.isInteger(n) ? String(n) : String(n);
}

export function extractRefreshRateHz(text: string): string | undefined {
  const m = text.match(/\b(\d{2,3})\s*Hz\b/i);
  if (!m) return undefined;
  const hz = parseInt(m[1], 10);
  if (hz < 48 || hz > 360) return undefined;
  return String(hz);
}

export function extractDisplayResolution(text: string): string | undefined {
  const s = text.trim();
  if (!s) return undefined;

  const named =
    s.match(/\b(WQXGA\+|WQXGA|WUXGA|QHD\+|QHD|UHD\+|UHD|FHD\+|FHD|HD\+|HD|4K|8K)\b/i)?.[1];
  if (named) return named.toUpperCase();

  const wxh = s.match(/\b(\d{3,4})\s*[x×]\s*(\d{3,4})\b/i);
  if (wxh) return `${wxh[1]}x${wxh[2]}`;

  return undefined;
}

/** Short GPU token: RTX 5070, GTX 1650, RX 7600, Radeon 780M, Intel Arc. */
export function extractGpuModel(text: string): string | undefined {
  const s = text.trim();
  if (!s) return undefined;

  const rtxTi = s.match(/\b(?:NVIDIA\s*)?(?:GeForce\s*)?RTX\s*™?\s*(\d{3,4})\s*(Ti)?\b/i);
  if (rtxTi) {
    const base = `RTX ${rtxTi[1]}`;
    return rtxTi[2] ? `${base} Ti` : base;
  }

  const gtx = s.match(/\bGTX\s*™?\s*(\d{3,4})\b/i);
  if (gtx) return `GTX ${gtx[1]}`;

  const rx = s.match(/\bRX\s*(\d{3,4})\s*(?:XTX|XT)?\b/i);
  if (rx) return `RX ${rx[1]}`;

  const radeon = s.match(/\bRadeon\s*(?:RX\s*)?(\d{3,4}M?)\b/i);
  if (radeon) return `Radeon ${radeon[1]}`;

  const arc = s.match(/\bIntel\s+Arc\s*([A-Za-z]?\d*)\b/i);
  if (arc) return `Intel Arc${arc[1] ? ` ${arc[1]}` : ""}`.trim();

  return undefined;
}

export function extractProcessorFamily(text: string): string | undefined {
  const s = text.trim();
  if (!s) return undefined;

  const ultra = s.match(/\bUltra\s*(\d+)\b/i);
  if (ultra) return `Ultra ${ultra[1]}`;

  const coreI = s.match(/\bCore\s*i\s*([3579])\b/i) ?? s.match(/\bCore\s*i([3579])\b/i);
  if (coreI) return `Core i${coreI[1]}`;

  const ryzen = s.match(/\bRyzen\s*(\d+)\b/i);
  if (ryzen) return `Ryzen ${ryzen[1]}`;

  const apple = s.match(/\bApple\s+M\d(?:\s*(?:Pro|Max|Ultra))?\b/i);
  if (apple) return apple[0].replace(/\s+/g, " ").trim();

  if (/Intel\s*Core/i.test(s) && s.length < 48) return "Intel Core";

  return undefined;
}

export function extractRamSizeGb(text: string): string | undefined {
  const m = text.match(/\b(\d{1,3})\s*GB\b/i);
  if (!m) return undefined;
  const gb = parseInt(m[1], 10);
  if (gb < 4 || gb > 128) return undefined;
  return String(gb);
}

export function extractStorageSizeGb(text: string): string | undefined {
  const tb = text.match(/\b(\d+(?:\.\d+)?)\s*TB\b/i);
  if (tb) return String(Math.round(parseFloat(tb[1]) * 1024));
  const gb = text.match(/\b(\d{3,4})\s*GB\b/i);
  if (gb) {
    const n = parseInt(gb[1], 10);
    if (n >= 64) return String(n);
  }
  return undefined;
}
