/** Build URL candidates for highest-quality remote image fetch. */

const PARAMS_TO_STRIP = new Set([
  "width",
  "w",
  "height",
  "h",
  "fit",
  "crop",
  "resize",
  "quality",
  "q",
  "format",
  "dpr",
  "auto",
  "scale",
]);

/** Params that must stay (CDN tokens, cache busting). */
const PARAMS_KEEP = new Set(["v", "variant", "revision", "timestamp", "ts", "token", "signature", "sig", "key", "policy", "expires", "expire"]);

function shouldStripParam(name: string): boolean {
  const lower = name.toLowerCase();
  if (PARAMS_KEEP.has(lower)) return false;
  if (PARAMS_TO_STRIP.has(lower)) return true;
  if (lower.endsWith("_width") || lower.endsWith("_height")) return true;
  if (lower.includes("width") && lower !== "viewport") return true;
  return false;
}

export function stripResizeSearchParams(url: URL): string {
  const next = new URL(url.href);
  const kept = new URLSearchParams();
  for (const [k, v] of next.searchParams) {
    if (!shouldStripParam(k)) kept.set(k, v);
  }
  next.search = kept.toString() ? `?${kept.toString()}` : "";
  return next.href;
}

/**
 * Returns ordered candidates: optimized URL first (if different), then original.
 */
export function getBestImageUrlCandidates(originalUrl: string): string[] {
  const out: string[] = [];
  try {
    const parsed = new URL(originalUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return [originalUrl];
    }
    const stripped = stripResizeSearchParams(parsed);
    if (stripped !== originalUrl) out.push(stripped);
  } catch {
    return [originalUrl];
  }
  out.push(originalUrl);
  return [...new Set(out)];
}
