// Tiny ad-hoc XML walker for Shopify sitemaps. No deps — keeps the importer
// runnable from any clone without extra installs.

function* iterTags(xml, name) {
  /** Word-boundary after name so `<sitemapindex>` doesn't match when caller asks for `<sitemap>`. */
  const re = new RegExp(`<${escapeRe(name)}\\b[^>]*>([\\s\\S]*?)</${escapeRe(name)}\\s*>`, "g");
  let m;
  while ((m = re.exec(xml)) !== null) yield m[1];
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function pickFirst(xml, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i");
  const m = re.exec(xml);
  return m ? m[1].trim() : null;
}

/**
 * Discover product page URLs from a Shopify storefront's sitemap index.
 * Returns the list of <loc> entries inside the products sub-sitemap.
 */
export async function fetchProductUrls(baseUrl, { fetcher = fetch, locale = "" } = {}) {
  const indexUrl = new URL("/sitemap.xml", baseUrl).toString();
  const indexXml = await fetchText(fetcher, indexUrl);

  /** Prefer the locale-prefixed products sitemap (e.g. /ar/sitemap_products_1.xml...) when locale is set. */
  const wantsLocale = locale && locale !== "";
  const childUrls = [];
  for (const sitemap of iterTags(indexXml, "sitemap")) {
    const loc = pickFirst(sitemap, "loc");
    if (!loc) continue;
    if (!/sitemap_products/i.test(loc)) continue;
    /** /ar/sitemap_products_*.xml when locale=ar, else default to the no-prefix one. */
    if (wantsLocale ? loc.includes(`/${locale}/`) : !/\/(ar|en)\//.test(loc)) {
      childUrls.push(loc);
    }
  }

  if (childUrls.length === 0) {
    throw new Error(
      `Could not find a products sitemap in ${indexUrl} (locale=${locale || "default"})`,
    );
  }

  const urls = [];
  for (const child of childUrls) {
    const xml = await fetchText(fetcher, child);
    for (const urlNode of iterTags(xml, "url")) {
      const loc = pickFirst(urlNode, "loc");
      if (!loc) continue;
      /** Sitemaps include the collection root and irrelevant URLs — keep only /products/<handle>. */
      if (/\/products\/[^/?#]+(?:[?#]|$)/.test(loc)) urls.push(loc);
    }
  }
  return urls;
}

/** Convert a /products/<handle> URL to its handle. */
export function handleFromUrl(productUrl) {
  const m = /\/products\/([^/?#]+)/.exec(productUrl);
  return m ? decodeURIComponent(m[1]) : null;
}

async function fetchText(fetcher, url) {
  const res = await fetcher(url, {
    headers: { "User-Agent": "freezone-importer/1 (+admin@freezone-iq.com)" },
  });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  return await res.text();
}
