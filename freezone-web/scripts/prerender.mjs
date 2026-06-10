/**
 * Build-time meta prerender — the SSR stopgap for the Vite SPA (WS4-B SEO).
 *
 * After `vite build`, this script copies `dist/index.html` into per-route
 * `dist/<locale>/<route>/index.html` files with the correct bilingual
 * <title>/<meta>/OG tags (and JSON-LD) injected. Netlify serves these static
 * files before the SPA catch-all rewrite, so crawlers and link unfurlers get
 * real metadata without executing JS, while users still get the normal SPA
 * (the runtime <Seo> component adopts the prerendered tags on hydration).
 *
 * Routes covered: static pages, every product (live API bootstrap), and every
 * category/brand listed by the API sitemap (slugs are parsed from
 * /api/public/sitemap.xml so prerendered URLs match the sitemap EXACTLY).
 *
 * Trailing slash: Netlify pretty-URLs 301 `/en/product/194` → `/en/product/194/`,
 * so the trailing-slash form is the one that serves 200. Every canonical,
 * hreflang, og:url and JSON-LD url emitted here uses it — keep in sync with
 * src/components/seo/* and the API sitemap route.
 *
 * Failure policy: a deploy must NOT silently ship without catalog shells.
 * If the catalog fetch fails, returns 0 products, or the sitemap fetch fails,
 * the script exits non-zero unless PRERENDER_ALLOW_EMPTY=1.
 *
 * Env:
 * - PRERENDER_SKIP=1            — skip entirely (local/dev builds).
 * - PRERENDER_ALLOW_EMPTY=1     — degrade failures to warnings (empty/dev API).
 * - VITE_API_URL                — API origin for the catalog + sitemap.
 * - VITE_PUBLIC_SITE_URL        — canonical site origin (default freezone-iq.com).
 * - PRERENDER_MAX_PRODUCTS      — cap on product pages per locale (default 500).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const SITE_ORIGIN = (process.env.VITE_PUBLIC_SITE_URL || "https://freezone-iq.com").replace(/\/$/, "");
const API_ORIGIN = (process.env.VITE_API_URL || "https://freezone-website.fly.dev").replace(/\/$/, "");
const MAX_PRODUCTS = Number(process.env.PRERENDER_MAX_PRODUCTS) > 0 ? Number(process.env.PRERENDER_MAX_PRODUCTS) : 500;
const ALLOW_EMPTY = process.env.PRERENDER_ALLOW_EMPTY === "1";
const SITE_NAME = "FreeZone";
const LOCALES = ["en", "ar"];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Interpolate i18next-style {{var}} placeholders. */
function fill(template, vars = {}) {
  return String(template ?? "").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

/** Canonical absolute URL — always the trailing-slash form Netlify serves with 200. */
function canonicalUrl(routePath) {
  return `${SITE_ORIGIN}${routePath.endsWith("/") ? routePath : `${routePath}/`}`;
}

async function loadSeoMessages(locale) {
  const raw = await readFile(path.join(ROOT, "src", "messages", `${locale}.json`), "utf8");
  return JSON.parse(raw).Seo ?? {};
}

function headBlock({ title, description, path: routePath, ogType = "website", image, jsonLd, locale }) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonical = canonicalUrl(routePath);
  const altPath = (lc) => routePath.replace(/^\/(en|ar)(?=\/|$)/, `/${lc}`);
  const lines = [
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${esc(description)}" data-fz-seo="1" />`,
    `<link rel="canonical" href="${esc(canonical)}" data-fz-seo="1" />`,
    ...LOCALES.map(
      (lc) => `<link rel="alternate" hreflang="${lc}" href="${esc(canonicalUrl(altPath(lc)))}" data-fz-seo="1" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${esc(canonicalUrl(altPath("en")))}" data-fz-seo="1" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" data-fz-seo="1" />`,
    `<meta property="og:title" content="${esc(fullTitle)}" data-fz-seo="1" />`,
    `<meta property="og:description" content="${esc(description)}" data-fz-seo="1" />`,
    `<meta property="og:type" content="${ogType}" data-fz-seo="1" />`,
    `<meta property="og:url" content="${esc(canonical)}" data-fz-seo="1" />`,
    `<meta property="og:locale" content="${locale === "ar" ? "ar_IQ" : "en_US"}" data-fz-seo="1" />`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" data-fz-seo="1" />`,
    `<meta name="twitter:title" content="${esc(fullTitle)}" data-fz-seo="1" />`,
    `<meta name="twitter:description" content="${esc(description)}" data-fz-seo="1" />`,
  ];
  if (image) {
    const abs = image.startsWith("http") ? image : `${API_ORIGIN}${image.startsWith("/") ? image : `/${image}`}`;
    lines.push(`<meta property="og:image" content="${esc(abs)}" data-fz-seo="1" />`);
    lines.push(`<meta name="twitter:image" content="${esc(abs)}" data-fz-seo="1" />`);
  }
  if (jsonLd) {
    for (const block of Array.isArray(jsonLd) ? jsonLd : [jsonLd]) {
      lines.push(`<script type="application/ld+json">${JSON.stringify(block).replace(/</g, "\\u003c")}</script>`);
    }
  }
  return lines.join("\n    ");
}

function renderRoute(template, locale, meta) {
  let html = template;
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${locale}"${locale === "ar" ? ' dir="rtl"' : ""}`);
  /** Drop the static dev <title> and inject the per-route head block. */
  html = html.replace(/<title>[\s\S]*?<\/title>/, "");
  html = html.replace("</head>", `  ${headBlock(meta)}\n  </head>`);
  return html;
}

async function writeRoute(template, locale, routePath, meta) {
  const html = renderRoute(template, locale, { ...meta, path: routePath, locale });
  const outDir = path.join(DIST, ...routePath.split("/").filter(Boolean));
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "index.html"), html, "utf8");
}

async function fetchCatalog(locale) {
  const url = `${API_ORIGIN}/api/ssr/storefront-bootstrap?locale=${locale}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  const data = await res.json();
  if (!Array.isArray(data?.catalog?.products)) throw new Error(`invalid bootstrap payload from ${url}`);
  return {
    products: data.catalog.products,
    categories: Array.isArray(data.catalog.categories) ? data.catalog.categories : [],
    brands: Array.isArray(data.catalog.brands) ? data.catalog.brands : [],
  };
}

/**
 * Category/brand slugs straight from the API sitemap so the prerendered URLs
 * match the crawled URLs EXACTLY (the bootstrap brand payload carries no slug).
 */
async function fetchSitemapSlugs() {
  const url = `${API_ORIGIN}/api/public/sitemap.xml`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  const xml = await res.text();
  const categories = new Set();
  const brands = new Set();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    let pathname;
    try {
      pathname = new URL(m[1].trim().replace(/&amp;/g, "&")).pathname;
    } catch {
      continue;
    }
    const match = pathname.match(/^\/(?:en|ar)\/(category|brand)\/([^/]+)\/?$/);
    if (!match) continue;
    const slug = decodeURIComponent(match[2]);
    /** Defensive: slugs become directory names — never traverse outside dist. */
    if (!slug || slug.includes("..") || /[\\/]/.test(slug)) continue;
    (match[1] === "category" ? categories : brands).add(slug);
  }
  return { categories: [...categories], brands: [...brands] };
}

/** Mirror of BrandLandingPage.brandSlug — URL-safe brand slug from a display name. */
function brandSlugFromName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Readable fallback label when a slug has no catalog match (e.g. "tp-link" → "Tp Link"). */
function humanizeSlug(slug) {
  return slug.replace(/-+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: canonicalUrl(it.path),
    })),
  };
}

function productJsonLd(p, locale) {
  const url = canonicalUrl(`/${locale}/product/${p.id}`);
  const images = (p.images ?? []).filter(Boolean).map((img) =>
    img.startsWith("http") ? img : `${API_ORIGIN}${img.startsWith("/") ? img : `/${img}`}`,
  );
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.desc,
    ...(images.length ? { image: images } : {}),
    ...(p.sku ? { sku: p.sku } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    offers: {
      "@type": "Offer",
      url,
      price: p.price,
      priceCurrency: "IQD",
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

async function main() {
  if (process.env.PRERENDER_SKIP === "1") {
    console.log("[prerender] PRERENDER_SKIP=1 — skipping.");
    return;
  }
  const indexPath = path.join(DIST, "index.html");
  if (!existsSync(indexPath)) {
    throw new Error("dist/index.html not found — run vite build first.");
  }
  const template = await readFile(indexPath, "utf8");

  /** Guard violations collected here decide the exit code (see failure policy). */
  const failures = [];

  let staticCount = 0;
  for (const locale of LOCALES) {
    const seo = await loadSeoMessages(locale);
    const staticRoutes = [
      ["", seo.homeTitle, seo.homeDesc],
      ["/products", seo.productsTitle, seo.productsDesc],
      ["/about", seo.aboutTitle, seo.aboutDesc],
      ["/contact", seo.contactTitle, seo.contactDesc],
      ["/pc-builder", seo.pcBuilderTitle, seo.pcBuilderDesc],
      ["/track-order", seo.trackOrderTitle, seo.trackOrderDesc],
      ["/shipping", seo.shippingTitle, seo.shippingDesc],
      ["/returns", seo.returnsTitle, seo.returnsDesc],
      ["/warranty", seo.warrantyTitle, seo.warrantyDesc],
      ["/faq", seo.faqTitle, seo.faqDesc],
      ["/privacy", seo.privacyTitle, seo.privacyDesc],
      ["/terms", seo.termsTitle, seo.termsDesc],
    ];
    for (const [route, title, description] of staticRoutes) {
      if (!title) continue;
      await writeRoute(template, locale, `/${locale}${route}`, { title, description: description ?? "" });
      staticCount++;
    }
  }
  console.log(`[prerender] wrote ${staticCount} static route shells.`);

  /** One bootstrap fetch per locale, reused by product AND category/brand passes. */
  const catalogs = {};
  for (const locale of LOCALES) {
    try {
      catalogs[locale] = await fetchCatalog(locale);
      console.log(
        `[prerender] bootstrap "${locale}": ${catalogs[locale].products.length} products, ` +
          `${catalogs[locale].categories.length} categories, ${catalogs[locale].brands.length} brands.`,
      );
    } catch (e) {
      catalogs[locale] = null;
      failures.push(`catalog fetch failed for "${locale}": ${e?.message ?? e}`);
    }
  }

  for (const locale of LOCALES) {
    const catalog = catalogs[locale];
    if (!catalog) continue;
    if (catalog.products.length === 0) {
      failures.push(`catalog for "${locale}" returned 0 products — refusing to ship a product-less deploy`);
    }
    const seo = await loadSeoMessages(locale);
    const categoryById = new Map(catalog.categories.filter((c) => c?.id).map((c) => [c.id, c]));
    const homeLabel = seo.breadcrumbHome || "Home";
    const products = catalog.products.slice(0, MAX_PRODUCTS);
    let productCount = 0;
    for (const p of products) {
      if (!p?.id || !p?.name) continue;
      const description = (p.desc ?? "").trim().slice(0, 250) || fill(seo.productDesc, { name: p.name });
      const breadcrumbItems = [{ name: homeLabel, path: `/${locale}` }];
      const cat = categoryById.get(p.cat);
      if (cat?.name) breadcrumbItems.push({ name: cat.name, path: `/${locale}/category/${cat.id}` });
      breadcrumbItems.push({ name: p.name, path: `/${locale}/product/${p.id}` });
      await writeRoute(template, locale, `/${locale}/product/${p.id}`, {
        title: p.name,
        description,
        ogType: "product",
        image: p.images?.[0] ?? null,
        jsonLd: [productJsonLd(p, locale), breadcrumbJsonLd(breadcrumbItems)],
      });
      productCount++;
    }
    console.log(`[prerender] wrote ${productCount} product pages for "${locale}".`);
  }

  let slugSets = null;
  try {
    slugSets = await fetchSitemapSlugs();
    console.log(
      `[prerender] sitemap lists ${slugSets.categories.length} categories, ${slugSets.brands.length} brands.`,
    );
  } catch (e) {
    failures.push(`sitemap fetch failed (category/brand pages skipped): ${e?.message ?? e}`);
  }

  if (slugSets) {
    for (const locale of LOCALES) {
      const seo = await loadSeoMessages(locale);
      const catalog = catalogs[locale];
      const categoryById = new Map((catalog?.categories ?? []).filter((c) => c?.id).map((c) => [c.id, c]));
      const homeLabel = seo.breadcrumbHome || "Home";

      let categoryCount = 0;
      for (const slug of slugSets.categories) {
        const cat = categoryById.get(slug);
        const name = cat?.name || humanizeSlug(slug);
        const routePath = `/${locale}/category/${slug}`;
        /** Child categories (Category.parentId tree) carry their parent in the crumb. */
        const parentCat = cat?.parent ? categoryById.get(cat.parent) : null;
        await writeRoute(template, locale, routePath, {
          title: fill(seo.categoryTitle, { name }),
          description: fill(seo.categoryDesc, { name }),
          image: cat?.img ?? null,
          jsonLd: breadcrumbJsonLd([
            { name: homeLabel, path: `/${locale}` },
            ...(parentCat?.name
              ? [{ name: parentCat.name, path: `/${locale}/category/${parentCat.id}` }]
              : []),
            { name, path: routePath },
          ]),
        });
        categoryCount++;
      }

      /** Brand pages resolve by name-derived slug at runtime — mirror that here. */
      const brandByDerivedSlug = new Map();
      for (const b of catalog?.brands ?? []) {
        if (!b?.name) continue;
        const derived = brandSlugFromName(b.name);
        if (derived && !brandByDerivedSlug.has(derived)) brandByDerivedSlug.set(derived, b);
      }
      let brandCount = 0;
      for (const slug of slugSets.brands) {
        const name = brandByDerivedSlug.get(slug)?.name || humanizeSlug(slug);
        const routePath = `/${locale}/brand/${slug}`;
        await writeRoute(template, locale, routePath, {
          title: fill(seo.brandTitle, { name }),
          description: fill(seo.brandDesc, { name }),
          jsonLd: breadcrumbJsonLd([
            { name: homeLabel, path: `/${locale}` },
            { name, path: routePath },
          ]),
        });
        brandCount++;
      }
      console.log(`[prerender] wrote ${categoryCount} category + ${brandCount} brand pages for "${locale}".`);
    }
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`[prerender] FAIL: ${f}`);
    if (ALLOW_EMPTY) {
      console.warn(`[prerender] PRERENDER_ALLOW_EMPTY=1 — continuing despite ${failures.length} failure(s).`);
    } else {
      console.error(
        "[prerender] exiting non-zero so the deploy never silently ships without SEO shells " +
          "(set PRERENDER_ALLOW_EMPTY=1 to override for empty/dev catalogs).",
      );
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error("[prerender] failed:", e?.message ?? e);
  if (ALLOW_EMPTY) {
    console.warn("[prerender] PRERENDER_ALLOW_EMPTY=1 — build continues despite the failure.");
  } else {
    process.exit(1);
  }
});
