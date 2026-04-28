/**
 * Brand name + optional default logo path (Vite SPA).
 *
 * Override with `VITE_PUBLIC_SITE_LOGO_URL=/path` in `.env` (public URL, starts with `/`).
 * PNG/JPEG/SVG use `<img>`; PDF uses `<object>` (browsers do not render PDF inside `<img>`).
 */
export const SITE_BRAND_NAME = "Store";

/** Default storefront logo when CMS has no `logoUrl` — file must exist under `public/`. */
export const SITE_LOGO_PUBLIC_PATH = "/brand/site-logo.png";

export function resolveSiteLogoUrl(): string | null {
  const raw = import.meta.env.VITE_PUBLIC_SITE_LOGO_URL;
  if (raw === "") return null;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return SITE_LOGO_PUBLIC_PATH.trim() || null;
}

export function isSiteLogoPdfUrl(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url.trim());
}
