// SEO for product URLs (issue #48): a product address that does not exist must
// not answer 200 with the SPA shell (a crawlable empty page).
//
// The storefront catalogue is static (src/site/data), so this function needs no
// API call: catalogue ids are FZ-001 … FZ-<LAST_PRODUCT>, each with its own
// prerendered shell.
//   - a catalogue id            → served normally (lower-case ids → 301 to the canonical form)
//   - a numeric id              → the previous catalogue's product; 301 to the product list
//   - anything else             → the SPA shell with a real 404 status + noindex
import type { Context } from "@netlify/edge-functions";

/**
 * Number of products in src/site/data/catalog.json. scripts/prerender.mjs fails
 * the build when this drifts from the catalogue, so a product added there can
 * never be 404'd here.
 */
const LAST_PRODUCT = 586;

export default async function handler(req: Request, context: Context): Promise<Response | void> {
  const url = new URL(req.url);
  const m = url.pathname.match(/^\/(en|ar)\/product\/([^/]+)\/?$/);
  if (!m) return; // not a product detail route — pass through untouched

  const locale = m[1];
  let id = m[2];
  try {
    id = decodeURIComponent(id);
  } catch {
    /* malformed escape → treated as unknown below */
  }

  const fz = /^fz-(\d{3})$/i.exec(id);
  if (fz) {
    const n = Number(fz[1]);
    if (n >= 1 && n <= LAST_PRODUCT) {
      const canonical = `FZ-${fz[1]}`;
      if (id === canonical) return; // real product → serve its prerendered page
      return Response.redirect(new URL(`/${locale}/product/${canonical}/`, url), 301);
    }
  }

  if (/^\d+$/.test(id)) {
    return Response.redirect(new URL(`/${locale}/products/`, url), 301);
  }

  // Unknown product: serve the SPA shell (renders the 404 page client-side)
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
