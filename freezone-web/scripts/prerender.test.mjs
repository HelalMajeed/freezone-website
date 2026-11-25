import { test, expect, vi, afterEach } from "vitest";
import { checkCatalog, headBlock, loadCatalog, productJsonLd, sitemapXml } from "./prerender.mjs";

/**
 * The storefront is static: the build-time SEO prerender reads the catalogue
 * from src/site/data and must work with no network at all (a deploy can no
 * longer fail, or ship without product pages, because the API was unreachable).
 * These tests lock that, the canonical trailing-slash form, and the build guard.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

test("loadCatalog reads the shipped catalogue without touching the network", async () => {
  const fetchSpy = vi.fn(() => {
    throw new Error("prerender must not fetch");
  });
  vi.stubGlobal("fetch", fetchSpy);
  const catalog = await loadCatalog();
  expect(catalog.products.length).toBeGreaterThan(0);
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("the shipped catalogue passes the build guard", async () => {
  expect(await checkCatalog(await loadCatalog())).toEqual([]);
});

test("the build guard rejects an empty catalogue, a gap in ids and a bad price", async () => {
  const catalog = await loadCatalog();
  expect((await checkCatalog({ ...catalog, products: [] })).join("\n")).toMatch(/0 products/);

  const gap = catalog.products.filter((p) => p.id !== "FZ-002");
  expect((await checkCatalog({ ...catalog, products: gap })).join("\n")).toMatch(/LAST_PRODUCT|without gaps/);

  const free = catalog.products.map((p) => (p.id === "FZ-001" ? { ...p, price: 0 } : p));
  expect((await checkCatalog({ ...catalog, products: free })).join("\n")).toMatch(/FZ-001: price/);
});

test("head tags use the trailing-slash canonical, both hreflangs and a site-hosted picture", () => {
  const html = headBlock({
    title: "Test product",
    description: 'A "quoted" <name>',
    path: "/ar/product/FZ-001",
    ogType: "product",
    image: "/catalog/FZ-001.webp",
    locale: "ar",
  });
  expect(html).toContain("<title>Test product | FreeZone</title>");
  expect(html).toContain('rel="canonical" href="https://freezone-iq.com/ar/product/FZ-001/"');
  expect(html).toContain('hreflang="en" href="https://freezone-iq.com/en/product/FZ-001/"');
  expect(html).toContain('hreflang="x-default" href="https://freezone-iq.com/en/product/FZ-001/"');
  expect(html).toContain('property="og:image" content="https://freezone-iq.com/catalog/FZ-001.webp"');
  expect(html).toContain("A &quot;quoted&quot; &lt;name&gt;");
});

test("product structured data carries the selling price in IQD and the availability", () => {
  const base = { id: "FZ-001", brand: "Acme", model: "X1", price: 125000 };
  const inStock = productJsonLd(base, "Acme X1", "en");
  expect(inStock.offers).toMatchObject({
    price: 125000,
    priceCurrency: "IQD",
    availability: "https://schema.org/InStock",
    url: "https://freezone-iq.com/en/product/FZ-001/",
  });
  expect(productJsonLd({ ...base, flag: "out" }, "Acme X1", "en").offers.availability).toBe(
    "https://schema.org/OutOfStock",
  );
});

test("the sitemap lists every route once per language with its alternates", () => {
  const xml = sitemapXml(["", "/products", "/product/FZ-001"]);
  expect(xml.match(/<url>/g)).toHaveLength(6);
  expect(xml).toContain("<loc>https://freezone-iq.com/ar/</loc>");
  expect(xml).toContain("<loc>https://freezone-iq.com/en/product/FZ-001/</loc>");
  expect(xml).toContain('hreflang="ar" href="https://freezone-iq.com/ar/products/"');
});
