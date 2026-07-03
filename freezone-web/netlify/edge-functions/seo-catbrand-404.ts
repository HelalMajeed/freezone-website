// SEO: turn the SPA "soft-404" into a real HTTP 404 for CATEGORY and BRAND URLs
// whose slug does not exist — the companion to seo-product-404.ts, extending the
// real-404 guarantee to the category/brand landing routes (closes the soft-404
// gap in docs/ENTERPRISE_GAP_AUDIT.md, SEO-1). Without this,
// /:locale/category/<bad> and /:locale/brand/<bad> served the SPA shell with
// status 200 — crawlable empty pages Search Console flags as "Soft 404".
//
// It mirrors the STOREFRONT's own existence decision exactly, using the SAME API
// data the bootstrap uses (getCategoriesCatalog / getBrandsCatalog), so it can
// never 404 a page the SPA would actually render:
//   • category valid ⇔ slug is a known category id (CategoryLandingPage: c.id === slug)
//   • brand valid    ⇔ slug matches a known brand name/slug, OR products exist for
//     that name (BrandLandingPage bounces only when `!brand && total === 0`).
//
// FAIL OPEN: any network error, timeout, or non-decisive API response serves the
// page normally. A backend hiccup must NEVER 404 a valid category/brand page.
import type { Context } from "@netlify/edge-functions";

const API = "https://freezone-website.fly.dev";
const TIMEOUT_MS = 2500;

/** Must stay in sync with BrandLandingPage.brandSlug
 *  (freezone-web/src/app/locale/landing/BrandLandingPage.tsx). */
function brandSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** GET + parse JSON with a hard timeout. Returns null on any non-2xx / error
 *  (non-decisive → the caller must fail open). */
async function getJson(path: string): Promise<unknown> {
  try {
    const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function categoryMissing(slug: string, locale: string): Promise<boolean> {
  const cats = await getJson(`/api/ssr/catalog/categories?locale=${locale}`);
  if (!Array.isArray(cats)) return false; // non-decisive → fail open
  return !cats.some((c) => c && typeof c === "object" && (c as { id?: unknown }).id === slug);
}

async function brandMissing(slug: string, locale: string): Promise<boolean> {
  const brands = await getJson(`/api/ssr/catalog/brands?locale=${locale}`);
  if (!Array.isArray(brands)) return false; // non-decisive → fail open
  const known = brands.some((b) => {
    const name = b && typeof b === "object" ? (b as { name?: unknown }).name : undefined;
    if (typeof name !== "string") return false;
    return brandSlug(name) === slug || name.toLowerCase() === slug.toLowerCase();
  });
  if (known) return false; // known brand → valid

  // Unknown slug: mirror BrandLandingPage's `total === 0` fallback — a brand not
  // in the list is still a valid page if products match the name (storefront
  // products carry a brand string, not a brand id).
  const products = await getJson(
    `/api/ssr/catalog/products?locale=${locale}&brand=${encodeURIComponent(slug)}&page=1&pageSize=1`,
  );
  const total =
    products && typeof products === "object" ? (products as { total?: unknown }).total : undefined;
  if (typeof total !== "number") return false; // non-decisive → fail open
  return total === 0; // no brand match AND no products → genuinely missing
}

export default async function handler(req: Request, context: Context): Promise<Response | void> {
  const { pathname } = new URL(req.url);
  const m = pathname.match(/^\/(en|ar)\/(category|brand)\/([^/]+)\/?$/);
  if (!m) return; // not a single category/brand landing route — pass through untouched

  const locale = m[1];
  const kind = m[2];
  const slug = decodeURIComponent(m[3]);

  const missing =
    kind === "category" ? await categoryMissing(slug, locale) : await brandMissing(slug, locale);
  if (!missing) return; // valid (or non-decisive) → serve the page normally

  // Unknown category/brand: serve the SPA shell (which renders the client-side
  // 404/redirect) but with a real 404 status + noindex so crawlers treat it right.
  const shell = await context.next();
  const headers = new Headers(shell.headers);
  headers.set("x-robots-tag", "noindex");
  headers.set("cache-control", "no-store");
  return new Response(shell.body, { status: 404, statusText: "Not Found", headers });
}

export const config = {
  path: ["/en/category/*", "/ar/category/*", "/en/brand/*", "/ar/brand/*"],
};
