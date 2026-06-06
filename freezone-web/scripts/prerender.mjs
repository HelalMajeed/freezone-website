/**
 * Build-time meta prerender — the SSR stopgap for the Vite SPA (WS4-B SEO).
 *
 * After `vite build`, this script copies `dist/index.html` into per-route
 * `dist/<locale>/<route>/index.html` files with the correct bilingual
 * <title>/<meta>/OG tags (and Product JSON-LD on product routes) injected.
 * Netlify serves these static files before the SPA catch-all redirect, so
 * crawlers and link unfurlers get real metadata without executing JS, while
 * users still get the normal SPA (the runtime <Seo> component adopts the
 * prerendered tags on hydration).
 *
 * Product routes come from the live API bootstrap. Every network step is
 * best-effort: on any failure the script logs, skips, and exits 0 so a
 * deploy never breaks because the API was unreachable at build time.
 *
 * Env:
 * - PRERENDER_SKIP=1            — skip entirely (local/dev builds).
 * - VITE_API_URL                — API origin for the product catalog.
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

async function loadSeoMessages(locale) {
  const raw = await readFile(path.join(ROOT, "src", "messages", `${locale}.json`), "utf8");
  return JSON.parse(raw).Seo ?? {};
}

function headBlock({ title, description, path: routePath, ogType = "website", image, jsonLd, locale }) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonical = `${SITE_ORIGIN}${routePath}`;
  const altPath = (lc) => routePath.replace(/^\/(en|ar)(?=\/|$)/, `/${lc}`);
  const lines = [
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${esc(description)}" data-fz-seo="1" />`,
    `<link rel="canonical" href="${esc(canonical)}" data-fz-seo="1" />`,
    ...LOCALES.map(
      (lc) => `<link rel="alternate" hreflang="${lc}" href="${esc(`${SITE_ORIGIN}${altPath(lc)}`)}" data-fz-seo="1" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${esc(`${SITE_ORIGIN}${altPath("en")}`)}" data-fz-seo="1" />`,
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
    lines.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`);
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
  return data.catalog.products;
}

function productJsonLd(p, locale) {
  const url = `${SITE_ORIGIN}/${locale}/product/${p.id}`;
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
    console.warn("[prerender] dist/index.html not found — run vite build first. Skipping.");
    return;
  }
  const template = await readFile(indexPath, "utf8");

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

  for (const locale of LOCALES) {
    try {
      const seo = await loadSeoMessages(locale);
      const products = (await fetchCatalog(locale)).slice(0, MAX_PRODUCTS);
      for (const p of products) {
        if (!p?.id || !p?.name) continue;
        const description = (p.desc ?? "").trim().slice(0, 250) || fill(seo.productDesc, { name: p.name });
        await writeRoute(template, locale, `/${locale}/product/${p.id}`, {
          title: p.name,
          description,
          ogType: "product",
          image: p.images?.[0] ?? null,
          jsonLd: productJsonLd(p, locale),
        });
      }
      console.log(`[prerender] wrote ${products.length} product pages for "${locale}".`);
    } catch (e) {
      console.warn(`[prerender] product pages skipped for "${locale}":`, e?.message ?? e);
    }
  }
}

main().catch((e) => {
  /** Never fail the build over prerendering — it is an SEO enhancement only. */
  console.warn("[prerender] failed (build continues):", e?.message ?? e);
});
