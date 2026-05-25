// Tiny ad-hoc XML walker for Shopify sitemaps. No external deps.
//
// Ported from `freezone-api/scripts/import-globaliraq/lib/sitemap.mjs`
// so the same parsing logic feeds both the CLI scripts and the in-process
// `POST /api/admin/import/globaliraq/run-batch` endpoint.

const USER_AGENT = "freezone-importer/1 (+admin@freezone-iq.com)";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function* iterTags(xml: string, name: string): Generator<string> {
  /** Word-boundary after the tag name so `<sitemapindex>` doesn't match when
   *  we ask for `<sitemap>`. */
  const re = new RegExp(`<${escapeRe(name)}\\b[^>]*>([\\s\\S]*?)</${escapeRe(name)}\\s*>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) yield m[1];
}

function pickFirst(xml: string, name: string): string | null {
  const re = new RegExp(`<${escapeRe(name)}\\b[^>]*>([\\s\\S]*?)</${escapeRe(name)}\\s*>`, "i");
  const m = re.exec(xml);
  return m ? m[1].trim() : null;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  return await res.text();
}

/**
 * Walk a Shopify storefront's sitemap index → product sub-sitemap(s) → product URLs.
 * Returns every `/products/<handle>` URL we find for the requested locale.
 */
export async function fetchProductUrls(
  baseUrl: string,
  opts: { locale?: string } = {},
): Promise<string[]> {
  const indexUrl = new URL("/sitemap.xml", baseUrl).toString();
  const indexXml = await fetchText(indexUrl);

  const wantsLocale = !!opts.locale;
  const childUrls: string[] = [];
  for (const sitemap of iterTags(indexXml, "sitemap")) {
    const loc = pickFirst(sitemap, "loc");
    if (!loc || !/sitemap_products/i.test(loc)) continue;
    if (wantsLocale ? loc.includes(`/${opts.locale}/`) : !/\/(ar|en)\//.test(loc)) {
      childUrls.push(loc);
    }
  }
  if (childUrls.length === 0) {
    throw new Error(
      `Could not find a products sitemap in ${indexUrl} (locale=${opts.locale ?? "default"})`,
    );
  }

  const urls: string[] = [];
  for (const child of childUrls) {
    const xml = await fetchText(child);
    for (const urlNode of iterTags(xml, "url")) {
      const loc = pickFirst(urlNode, "loc");
      if (!loc) continue;
      if (/\/products\/[^/?#]+(?:[?#]|$)/.test(loc)) urls.push(loc);
    }
  }
  return urls;
}

/** Convert a `/products/<handle>` URL to its decoded handle (e.g. for filenames). */
export function handleFromUrl(productUrl: string): string | null {
  const m = /\/products\/([^/?#]+)/.exec(productUrl);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Convert the locale-prefixed product URL Shopify gave us into the JSON endpoint. */
export function productJsonUrl(productUrl: string): string {
  return productUrl
    .replace(/\/(ar|en)\/products\//, "/products/")
    .replace(/[?#].*$/, "")
    .replace(/\/?$/, "") + ".json";
}

/** Convenience: fetch the canonical /products/<handle>.json blob, retrying with
 *  backoff on transient upstream throttling (429 / 5xx). Global Iraq is a
 *  Shopify store and will 429 a burst of requests; a few spaced retries clear
 *  it without failing the product. */
export async function fetchShopifyProduct(productUrl: string): Promise<Record<string, unknown>> {
  const url = productJsonUrl(productUrl);
  const backoffMs = [500, 1500, 4000];
  let lastErr = "";
  for (let attempt = 0; attempt <= backoffMs.length; attempt += 1) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) {
      const body = (await res.json()) as { product?: Record<string, unknown> };
      return body.product ?? (body as Record<string, unknown>);
    }
    lastErr = `${res.status} ${res.statusText}`;
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt === backoffMs.length) {
      throw new Error(`GET ${url} → ${lastErr}`);
    }
    await new Promise((r) => setTimeout(r, backoffMs[attempt]));
  }
  throw new Error(`GET ${url} → ${lastErr}`);
}
