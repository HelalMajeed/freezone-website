/**
 * Image source validation. We never auto-use competitor images without approval.
 * Allowed: same-origin uploads (/uploads/...), manufacturer/official/CDN https
 * image URLs. Flagged for approval: competitor hosts (e.g. globaliraq.iq).
 */
import type { ImageCheck } from "./types";

/** Competitor hosts whose images require explicit approval before use. */
const COMPETITOR_HOSTS = ["globaliraq.iq"];

const IMG_EXT = /\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i;
/** Known image CDNs / patterns that serve images without a file extension. */
const KNOWN_IMG_PATH = /(\/image|\/img|\/media|\/photos?|\/cdn|\/assets)\b/i;

export function validateImageUrl(rawUrl: string): ImageCheck {
  const url = (rawUrl || "").trim();
  if (!url) return { url, verdict: "empty", host: null };

  // Same-origin upload served by the API (public/uploads volume).
  if (url.startsWith("/uploads/")) return { url, verdict: "same_origin_upload", host: null };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url, verdict: "invalid_url", host: null };
  }
  if (parsed.protocol !== "https:") return { url, verdict: "invalid_url", host: parsed.host || null };

  const host = parsed.host.toLowerCase();
  if (COMPETITOR_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
    return { url, verdict: "needs_approval_competitor", host };
  }
  if (!IMG_EXT.test(parsed.pathname) && !KNOWN_IMG_PATH.test(parsed.pathname)) {
    return { url, verdict: "unsupported_format", host };
  }
  return { url, verdict: "ok", host };
}

export function isUsableImage(check: ImageCheck | null): boolean {
  return !!check && (check.verdict === "ok" || check.verdict === "same_origin_upload");
}
