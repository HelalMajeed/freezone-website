// SEO: turn the SPA "soft-404" into a real HTTP 404 for product URLs whose id
// does not exist (issue #48). Without this, /:locale/product/<bad-id> served the
// SPA shell with status 200 — a crawlable empty page. Scope is PRODUCT routes
// only (the high-volume, unambiguous case): the API's /api/ssr/product/:id
// returns 200 for a real product, 404 for a missing one, 400 for a non-numeric
// id. Category/brand routes are intentionally left alone (few, mostly valid, and
// their existence check is fuzzier — a wrong check could 404 a valid page).
//
// FAIL OPEN: any network error, timeout, or non-decisive API response serves the
// page normally. A backend hiccup must NEVER 404 a valid product page.
import type { Context } from "@netlify/edge-functions";

const API = "https://freezone-website.fly.dev";

export default async function handler(req: Request, context: Context): Promise<Response | void> {
  const { pathname } = new URL(req.url);
  const m = pathname.match(/^\/(?:en|ar)\/product\/([^/]+)\/?$/);
  if (!m) return; // not a product detail route — pass through untouched

  const id = decodeURIComponent(m[1]);

  let missing = false;
  try {
    const res = await fetch(`${API}/api/ssr/product/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.status === 404 || res.status === 400) {
      missing = true; // genuinely unknown / invalid id
    } else if (!res.ok) {
      return; // 5xx or other → fail open, serve the page
    }
  } catch {
    return; // network error / timeout → fail open, serve the page
  }

  if (!missing) return; // real product → serve normally

  // Unknown product: serve the SPA shell (renders the custom 404 client-side)
  // but with a real 404 status + noindex so crawlers treat it correctly.
  const shell = await context.next();
  const headers = new Headers(shell.headers);
  headers.set("x-robots-tag", "noindex");
  headers.set("cache-control", "no-store");
  return new Response(shell.body, { status: 404, statusText: "Not Found", headers });
}

export const config = {
  path: ["/en/product/*", "/ar/product/*"],
};
