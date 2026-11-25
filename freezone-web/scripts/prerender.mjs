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
 * The storefront is static (src/site): its catalogue is the JSON in
 * src/site/data, so this script reads that file and makes NO network request.
 * Routes covered, in both languages: the home page, the product list and every
 * product. It also writes `dist/sitemap.xml` listing exactly those routes.
 *
 * Trailing slash: Netlify pretty-URLs 301 `/en/product/FZ-001` →
 * `/en/product/FZ-001/`, so the trailing-slash form is the one that serves 200.
 * Every canonical, hreflang, og:url, JSON-LD url and sitemap <loc> emitted here
 * uses it — keep in sync with src/components/seo/Seo.tsx.
 *
 * Failure policy: a deploy must NOT silently ship without product shells. An
 * empty or unreadable catalogue, a missing product picture, or a product edge
 * function (netlify/edge-functions/seo-product-404.ts) that disagrees with the
 * catalogue about the last product id exits non-zero.
 *
 * Env:
 * - PRERENDER_SKIP=1            — skip entirely (local/dev builds).
 * - VITE_PUBLIC_SITE_URL        — canonical site origin (default freezone-iq.com).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const SITE_ORIGIN = (process.env.VITE_PUBLIC_SITE_URL || "https://freezone-iq.com").replace(/\/$/, "");
const SITE_NAME = "FreeZone";
const INSTAGRAM_URL = "https://www.instagram.com/fzone.iq";
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

/** Names carry bidi isolates / non-breaking characters for on-page layout only (src/site/catalog.ts plainText). */
function plainText(s) {
  return String(s ?? "")
    .replace(/[\u2066\u2067\u2068\u2069]/g, "")
    .replace(/\u2011/g, "-")
    .replace(/\u00a0/g, " ");
}

/** 1540000 → "1,540,000" (src/site/catalog.ts formatMoney). */
function formatMoney(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function loadMessages(locale) {
  const raw = await readFile(path.join(ROOT, "src", "messages", `${locale}.json`), "utf8");
  return JSON.parse(raw).Site ?? {};
}

export async function loadCatalog() {
  const raw = await readFile(path.join(ROOT, "src", "site", "data", "catalog.json"), "utf8");
  const catalog = JSON.parse(raw);
  if (!Array.isArray(catalog?.products)) throw new Error("src/site/data/catalog.json has no products array");
  return catalog;
}

export function headBlock({ title, description, path: routePath, ogType = "website", image, jsonLd, locale }) {
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
    /** Pictures are static files of this site (public/catalog), not API uploads. */
    const abs = image.startsWith("http") ? image : `${SITE_ORIGIN}${image.startsWith("/") ? image : `/${image}`}`;
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

/** Organization + WebSite — the same block src/site/SiteLayout.tsx renders at runtime. */
function siteJsonLd(locale) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        logo: `${SITE_ORIGIN}/site/logo.svg`,
        sameAs: [INSTAGRAM_URL],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        url: SITE_ORIGIN,
        name: SITE_NAME,
        inLanguage: locale === "ar" ? "ar-IQ" : "en-IQ",
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_ORIGIN}/${locale}/products/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/** The same Product block src/site/ProductPage.tsx renders at runtime. */
export function productJsonLd(p, name, locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image: [`${SITE_ORIGIN}/catalog/${p.id}.webp`],
    sku: p.id,
    ...(p.model ? { mpn: p.model } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    offers: {
      "@type": "Offer",
      url: canonicalUrl(`/${locale}/product/${p.id}`),
      price: p.price,
      priceCurrency: "IQD",
      availability: p.flag === "out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

/** One <url> per page and language, each naming its other-language twin. */
export function sitemapXml(routes) {
  const entries = [];
  for (const route of routes) {
    for (const locale of LOCALES) {
      const alternates = [
        ...LOCALES.map(
          (lc) => `    <xhtml:link rel="alternate" hreflang="${lc}" href="${esc(canonicalUrl(`/${lc}${route}`))}" />`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(canonicalUrl(`/en${route}`))}" />`,
      ];
      entries.push(
        `  <url>\n    <loc>${esc(canonicalUrl(`/${locale}${route}`))}</loc>\n${alternates.join("\n")}\n  </url>`,
      );
    }
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `${entries.join("\n")}\n</urlset>\n`
  );
}

/** Things that must hold before product pages are written; each entry is a reason to fail the build. */
export async function checkCatalog(catalog) {
  const failures = [];
  const { products } = catalog;
  if (products.length === 0) failures.push("catalogue has 0 products — refusing to ship a product-less deploy");

  const ids = new Set();
  for (const p of products) {
    if (!/^FZ-\d{3}$/.test(p?.id ?? "")) failures.push(`bad product id "${p?.id}"`);
    if (ids.has(p.id)) failures.push(`duplicate product id "${p.id}"`);
    ids.add(p.id);
    if (!Number.isInteger(p.price) || p.price <= 0) failures.push(`${p.id}: price must be whole dinars above 0`);
    if (!p.nameAr || !p.nameEn) failures.push(`${p.id}: name missing in one language`);
    for (const file of [`catalog/${p.id}.webp`, `catalog/s/${p.id}.webp`]) {
      if (!existsSync(path.join(ROOT, "public", file))) failures.push(`${p.id}: picture public/${file} is missing`);
    }
  }
  for (let n = 1; n <= products.length; n++) {
    const id = `FZ-${String(n).padStart(3, "0")}`;
    if (!ids.has(id)) failures.push(`ids must run FZ-001…FZ-${String(products.length).padStart(3, "0")} without gaps — ${id} is missing`);
  }

  /** The edge function 404s product ids above its LAST_PRODUCT constant. */
  const edge = await readFile(path.join(ROOT, "netlify", "edge-functions", "seo-product-404.ts"), "utf8");
  const last = Number(/const LAST_PRODUCT = (\d+);/.exec(edge)?.[1]);
  if (last !== products.length) {
    failures.push(
      `netlify/edge-functions/seo-product-404.ts has LAST_PRODUCT = ${last} but the catalogue has ${products.length} products — update the constant`,
    );
  }
  return failures;
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

  const catalog = await loadCatalog();
  const failures = await checkCatalog(catalog);
  if (failures.length > 0) {
    for (const f of failures.slice(0, 40)) console.error(`[prerender] FAIL: ${f}`);
    if (failures.length > 40) console.error(`[prerender] …and ${failures.length - 40} more.`);
    console.error("[prerender] exiting non-zero so the deploy never ships a broken catalogue.");
    process.exit(1);
  }

  for (const locale of LOCALES) {
    const msg = await loadMessages(locale);
    for (const key of ["seoHomeTitle", "seoHomeDesc", "seoProductsTitle", "seoProductsDesc", "seoProductDesc", "home", "products"]) {
      if (!msg[key]) throw new Error(`messages/${locale}.json is missing Site.${key}`);
    }

    await writeRoute(template, locale, `/${locale}`, {
      title: msg.seoHomeTitle,
      description: msg.seoHomeDesc,
      jsonLd: siteJsonLd(locale),
    });
    await writeRoute(template, locale, `/${locale}/products`, {
      title: msg.seoProductsTitle,
      description: msg.seoProductsDesc,
      jsonLd: breadcrumbJsonLd([
        { name: msg.home, path: `/${locale}` },
        { name: msg.products, path: `/${locale}/products` },
      ]),
    });

    for (const p of catalog.products) {
      const name = plainText(locale === "ar" ? p.nameAr : p.nameEn);
      const routePath = `/${locale}/product/${p.id}`;
      await writeRoute(template, locale, routePath, {
        title: name,
        description: fill(msg.seoProductDesc, { name, price: formatMoney(p.price) }),
        ogType: "product",
        image: `/catalog/${p.id}.webp`,
        jsonLd: [
          productJsonLd(p, name, locale),
          breadcrumbJsonLd([
            { name: msg.home, path: `/${locale}` },
            { name: msg.products, path: `/${locale}/products` },
            { name, path: routePath },
          ]),
        ],
      });
    }
    console.log(`[prerender] wrote home, product list and ${catalog.products.length} product pages for "${locale}".`);
  }

  const routes = ["", "/products", ...catalog.products.map((p) => `/product/${p.id}`)];
  await writeFile(path.join(DIST, "sitemap.xml"), sitemapXml(routes), "utf8");
  console.log(`[prerender] wrote sitemap.xml with ${routes.length * LOCALES.length} URLs.`);
}

/** Only run the build when executed directly (`node scripts/prerender.mjs`).
 *  Importing this module (e.g. from a test) must not write anything. */
const isDirectRun = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((e) => {
    console.error("[prerender] failed:", e?.message ?? e);
    process.exit(1);
  });
}
