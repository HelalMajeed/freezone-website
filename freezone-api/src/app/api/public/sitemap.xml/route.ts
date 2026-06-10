import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { PUBLISHED_LIVE_WHERE } from "@/lib/admin-product-scope";

/**
 * GET /api/public/sitemap.xml — product-feed sitemap (contract (h)).
 *
 * Emits the ACTUAL locale-prefixed storefront routes (the SPA serves every
 * public page under /:locale): home, listing, static pages, every published
 * non-deleted product (/:locale/product/:id/), every active category
 * (/:locale/category/:slug/) and brand (/:locale/brand/:slug/). Both locales
 * are listed. Absolute URLs on https://freezone-iq.com (override via
 * PUBLIC_SITE_ORIGIN).
 *
 * Trailing slash: Netlify pretty-URLs 301 the slash-less form of every
 * prerendered route to `…/`, so the trailing-slash form is the canonical one
 * that serves 200 — keep in sync with freezone-web/scripts/prerender.mjs and
 * freezone-web/src/components/seo/Seo.tsx.
 */

const LOCALES = ["en", "ar"] as const;
/** Locale-relative static paths ("" = the localized home page). */
const STATIC_PATHS = ["", "/products", "/about", "/contact", "/warranty", "/faq"];

/** Hard cap so a single request never materializes the entire product table
 *  into memory. Also keeps the document under the 50k-URL sitemap limit; once
 *  the catalog can exceed this, split into a paged sitemap index. */
const MAX_SITEMAP_PRODUCTS = 50_000;

export async function GET(): Promise<Response> {
  const base =
    process.env.PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, "") || "https://freezone-iq.com";

  // Static pages, per locale (e.g. /en, /en/products, /ar, /ar/products, ...).
  const urls: Array<{ loc: string; lastmod?: string }> = [];
  for (const loc of LOCALES) {
    for (const p of STATIC_PATHS) {
      urls.push({ loc: `${base}/${loc}${p}/` });
    }
  }

  if (isDatabaseConfigured()) {
    try {
      const [products, categories, brands] = await Promise.all([
        prisma.product.findMany({
          where: { ...PUBLISHED_LIVE_WHERE },
          select: { id: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: MAX_SITEMAP_PRODUCTS,
        }),
        prisma.category.findMany({
          where: { active: true },
          select: { slug: true },
          orderBy: { sortOrder: "asc" },
        }),
        prisma.brand.findMany({
          where: { active: true },
          select: { slug: true },
          orderBy: { sortOrder: "asc" },
        }),
      ]);
      for (const loc of LOCALES) {
        for (const p of products) {
          urls.push({
            // Live route: /:locale/product/:id/ (the storefront resolves by id).
            loc: `${base}/${loc}/product/${encodeURIComponent(String(p.id))}/`,
            lastmod: p.updatedAt.toISOString(),
          });
        }
        for (const c of categories) {
          if (!c.slug?.trim()) continue;
          urls.push({ loc: `${base}/${loc}/category/${encodeURIComponent(c.slug)}/` });
        }
        for (const b of brands) {
          if (!b.slug?.trim()) continue;
          urls.push({ loc: `${base}/${loc}/brand/${encodeURIComponent(b.slug)}/` });
        }
      }
    } catch (e) {
      /** Degrade to the static pages instead of failing the crawl. */
      console.error("[sitemap] catalog query failed:", e instanceof Error ? e.message : e);
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${xmlEscape(u.loc)}</loc>` +
          (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : "") +
          `</url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function xmlEscape(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
