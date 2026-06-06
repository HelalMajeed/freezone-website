import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { PUBLISHED_LIVE_WHERE } from "@/lib/admin-product-scope";

/**
 * GET /api/public/sitemap.xml — product-feed sitemap (contract (h)).
 *
 * Standard `<urlset>` with the static pages, every published non-deleted
 * product with a slug (`<lastmod>` = updatedAt), every active category and
 * every active brand. Absolute URLs on https://freezone-iq.com (override
 * base with env `PUBLIC_SITE_ORIGIN`).
 */

const STATIC_PATHS = ["/", "/products", "/contact", "/about"];

/** Hard cap so a single request never materializes the entire product table
 *  into memory. Also keeps the document under the 50k-URL sitemap limit; once
 *  the catalog can exceed this, split into a paged sitemap index. */
const MAX_SITEMAP_PRODUCTS = 50_000;

export async function GET(): Promise<Response> {
  const base =
    process.env.PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, "") || "https://freezone-iq.com";

  const urls: Array<{ loc: string; lastmod?: string }> = STATIC_PATHS.map((p) => ({
    loc: `${base}${p}`,
  }));

  if (isDatabaseConfigured()) {
    try {
      const [products, categories, brands] = await Promise.all([
        prisma.product.findMany({
          where: { ...PUBLISHED_LIVE_WHERE, slug: { not: null } },
          select: { slug: true, updatedAt: true },
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
      for (const p of products) {
        if (!p.slug?.trim()) continue;
        urls.push({
          loc: `${base}/products/${encodeURIComponent(p.slug)}`,
          lastmod: p.updatedAt.toISOString(),
        });
      }
      for (const c of categories) {
        urls.push({ loc: `${base}/products?category=${encodeURIComponent(c.slug)}` });
      }
      for (const b of brands) {
        urls.push({ loc: `${base}/products?brand=${encodeURIComponent(b.slug)}` });
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
