import { prisma, isDatabaseConfigured } from "@/lib/prisma";

/**
 * Dynamic sitemap built from the live catalog.
 *
 *   GET /api/seo/sitemap.xml
 *
 * Netlify proxies `https://freezone-iq.com/sitemap.xml` to this endpoint
 * (see netlify.toml) so crawlers fetch it from the storefront origin.
 *
 * Includes: static pages + every published, non-deleted product, each with
 * `ar` + `en` `hreflang` alternates. Cached for an hour at the edge.
 */

const SITE_URL = (process.env.SEO_SITE_URL || "https://freezone-iq.com").replace(/\/$/, "");
const LOCALES = ["ar", "en"] as const;
const STATIC_PATHS = ["", "products", "pc-builder", "about", "contact"];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface UrlEntry {
  path: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

/** Render one <url> with xhtml:link alternates for every locale. */
function renderUrl(entry: UrlEntry): string {
  const alternates = LOCALES.map(
    (lc) =>
      `    <xhtml:link rel="alternate" hreflang="${lc}" href="${xmlEscape(`${SITE_URL}/${lc}${entry.path ? "/" + entry.path : ""}`)}"/>`,
  ).join("\n");
  /** Canonical loc points at the Arabic locale (primary market). */
  const loc = `${SITE_URL}/ar${entry.path ? "/" + entry.path : ""}`;
  return [
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : "",
    entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : "",
    entry.priority ? `    <priority>${entry.priority}</priority>` : "",
    alternates,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function GET() {
  const entries: UrlEntry[] = STATIC_PATHS.map((p) => ({
    path: p,
    changefreq: p === "" ? "daily" : "weekly",
    priority: p === "" ? "1.0" : "0.7",
  }));

  if (isDatabaseConfigured()) {
    try {
      const products = await prisma.product.findMany({
        where: { published: true, deletedAt: null },
        select: { id: true, updatedAt: true },
        orderBy: { id: "asc" },
        take: 5000,
      });
      for (const p of products) {
        entries.push({
          path: `product/${p.id}`,
          lastmod: p.updatedAt.toISOString().split("T")[0],
          changefreq: "weekly",
          priority: "0.8",
        });
      }

      const categories = await prisma.category.findMany({
        where: { active: true },
        select: { slug: true },
      });
      for (const c of categories) {
        entries.push({ path: `products?cat=${encodeURIComponent(c.slug)}`, changefreq: "weekly", priority: "0.6" });
      }
    } catch (e) {
      /** Never 500 the sitemap — serve the static portion if the DB hiccups. */
      console.error("[sitemap] db read failed:", e instanceof Error ? e.message : e);
    }
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.map(renderUrl),
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
