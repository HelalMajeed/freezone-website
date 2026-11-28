import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import raw from "./data/catalog.json";
import featuresAr from "./data/features.ar.json";
import featuresEn from "./data/features.en.json";
import {
  buildListView,
  DEFAULT_FILTERS,
  filtersQuery,
  formatMoney,
  normalizeProductId,
  PAGE_SIZE,
  PRICE_RANGES,
  prepareCatalog,
  readFilters,
  relatedProducts,
  searchCatalog,
  searchKey,
  type SiteCatalog,
} from "./catalog";
import { pageWindow } from "./ProductsListPage";

const catalog: SiteCatalog = prepareCatalog(raw as unknown as Parameters<typeof prepareCatalog>[0]);
const root = path.resolve(__dirname, "..", "..");
const filters = (q: string) => readFilters(catalog, new URLSearchParams(q));

describe("storefront catalogue data", () => {
  it("has ids FZ-001… with no gaps or repeats", () => {
    const ids = catalog.products.map((p) => p.id).sort();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(ids.map((_, i) => `FZ-${String(i + 1).padStart(3, "0")}`));
  });

  it("gives every product a section, a type, both names, a whole-dinar price and both pictures", () => {
    for (const p of catalog.products) {
      expect(catalog.catById.has(p.cat), `${p.id} section`).toBe(true);
      expect(catalog.subById.get(p.sub)?.cat, `${p.id} type`).toBe(p.cat);
      expect(catalog.brands.includes(p.brand), `${p.id} brand`).toBe(true);
      expect(p.nameAr && p.nameEn && p.kindAr && p.kindEn, `${p.id} names`).toBeTruthy();
      expect(Number.isInteger(p.price) && p.price > 0, `${p.id} price`).toBe(true);
      expect(existsSync(path.join(root, "public", "catalog", `${p.id}.webp`)), `${p.id} picture`).toBe(true);
      expect(existsSync(path.join(root, "public", "catalog", "s", `${p.id}.webp`)), `${p.id} small picture`).toBe(true);
    }
  });

  it("carries selling prices only", () => {
    const text = readFileSync(path.join(root, "src", "site", "data", "catalog.json"), "utf8");
    for (const banned of ['"cost"', '"basis"', '"markup"', '"low"', '"high"']) expect(text).not.toContain(banned);
  });

  it("has specification lines for every product in both languages", () => {
    for (const p of catalog.products) {
      expect((featuresAr as Record<string, string[]>)[p.id]?.length, `${p.id} ar`).toBeGreaterThan(0);
      expect((featuresEn as Record<string, string[]>)[p.id]?.length, `${p.id} en`).toBeGreaterThan(0);
    }
  });

  it("matches the product edge function's last id", () => {
    const edge = readFileSync(path.join(root, "netlify", "edge-functions", "seo-product-404.ts"), "utf8");
    expect(Number(/const LAST_PRODUCT = (\d+);/.exec(edge)?.[1])).toBe(catalog.products.length);
  });
});

describe("product list filters", () => {
  it("groups by brand until a brand or a search is chosen", () => {
    const view = buildListView(catalog, DEFAULT_FILTERS);
    expect(view.sectioned).toBe(true);
    expect(view.list.length).toBe(catalog.products.length);
    expect(buildListView(catalog, filters("brand=Hikvision")).sectioned).toBe(false);
    expect(buildListView(catalog, filters("q=camera")).sectioned).toBe(false);
  });

  it("narrows by brand, section and type, and pages the result", () => {
    const brand = buildListView(catalog, filters("brand=hikvision"));
    expect(brand.list.length).toBeGreaterThan(0);
    expect(brand.list.every((p) => p.brand === "Hikvision")).toBe(true);
    expect(brand.pages).toBe(Math.ceil(brand.list.length / PAGE_SIZE));

    const typed = buildListView(catalog, filters("cat=net&sub=router"));
    expect(typed.list.length).toBeGreaterThan(0);
    expect(typed.list.every((p) => p.sub === "router")).toBe(true);
  });

  it("picks the section itself when a brand has only one", () => {
    const single = catalog.brands.find(
      (b) => b && new Set(catalog.products.filter((p) => p.brand === b).map((p) => p.cat)).size === 1,
    );
    expect(single).toBeTruthy();
    const view = buildListView(catalog, filters(`brand=${encodeURIComponent(single!)}`));
    expect(view.cat).not.toBe("all");
  });

  it("searches Arabic and English names and models", () => {
    const p = catalog.products.find((x) => x.model.length > 5)!;
    expect(buildListView(catalog, filters(`q=${encodeURIComponent(p.model.toLowerCase())}`)).list).toContain(p);
    expect(buildListView(catalog, filters("q=كاميرا")).list.length).toBeGreaterThan(0);
    expect(buildListView(catalog, filters("q=zzzz-no-such-product")).list.length).toBe(0);
  });

  it("ignores values the catalogue does not have and round-trips through the address bar", () => {
    expect(filters("brand=nope&cat=nope&sub=nope&page=-3")).toEqual(DEFAULT_FILTERS);
    const f = filters("brand=other&cat=cctv&q=x&page=2");
    expect(filters(filtersQuery(f).slice(1))).toEqual(f);
    expect(filtersQuery(DEFAULT_FILTERS)).toBe("");
  });

  it("sorts by price, puts new arrivals first, and keeps the catalogue order otherwise", () => {
    const up = buildListView(catalog, filters("cat=pc&sort=price-asc")).list;
    expect(up.length).toBeGreaterThan(1);
    expect(up.every((p, i) => i === 0 || up[i - 1].price <= p.price)).toBe(true);
    const down = buildListView(catalog, filters("cat=pc&sort=price-desc")).list;
    expect(down.every((p, i) => i === 0 || down[i - 1].price >= p.price)).toBe(true);
    const fresh = buildListView(catalog, filters("sort=new")).list;
    const firstOld = fresh.findIndex((p) => p.flag !== "new");
    expect(firstOld).toBeGreaterThan(0);
    expect(fresh.slice(firstOld).some((p) => p.flag === "new")).toBe(false);
    expect(buildListView(catalog, filters("sort=price-asc")).sectioned).toBe(false);
  });

  it("narrows by price range and by availability", () => {
    let seen = 0;
    for (const r of PRICE_RANGES) {
      const list = buildListView(catalog, filters(`price=${r.id}`)).list;
      expect(list.every((p) => p.price >= r.min && (r.max === null || p.price < r.max)), r.id).toBe(true);
      seen += list.length;
    }
    /** The ranges cover every product exactly once. */
    expect(seen).toBe(catalog.products.length);
    const available = buildListView(catalog, filters("stock=1")).list;
    expect(available.some((p) => p.flag === "out")).toBe(false);
    expect(available.length).toBe(catalog.products.filter((p) => p.flag !== "out").length);
    expect(filters("sort=nope&price=nope&stock=yes")).toEqual(DEFAULT_FILTERS);
  });

  it("matches every word of a search, in any order, and folds Arabic letter variants", () => {
    const p = catalog.products.find((x) => x.brand && x.model.length > 5)!;
    const q = `${p.model.toLowerCase()} ${p.brand.toLowerCase()}`;
    expect(buildListView(catalog, filters(`q=${encodeURIComponent(q)}`)).list).toContain(p);
    expect(searchKey("كاميرة إنذار ٤")).toBe(searchKey("كاميره انذار 4"));
    expect(buildListView(catalog, filters(`q=${encodeURIComponent("كاميره")}`)).list.length).toBe(
      buildListView(catalog, filters(`q=${encodeURIComponent("كاميرة")}`)).list.length,
    );
  });

  it("offers similar products of the same type, never the product itself", () => {
    const p = catalog.byId.get("FZ-001")!;
    const related = relatedProducts(catalog, p);
    expect(related.length).toBeLessThanOrEqual(5);
    expect(related.every((r) => r.sub === p.sub && r.id !== p.id)).toBe(true);
  });
});

describe("instant search", () => {
  it("returns nothing for an empty search", () => {
    expect(searchCatalog(catalog, "  ")).toEqual({ products: [], total: 0, cats: [], subs: [], brands: [] });
  });

  it("puts an exact model first and reports the full count", () => {
    const p = catalog.products.find((x) => x.model.length > 6 && x.flag !== "out")!;
    const hits = searchCatalog(catalog, p.model, 6);
    expect(hits.products[0].model).toBe(p.model);
    expect(hits.products.length).toBeLessThanOrEqual(6);
    expect(hits.total).toBeGreaterThanOrEqual(hits.products.length);
  });

  it("suggests the brand and the section that match", () => {
    expect(searchCatalog(catalog, "hik").brands).toContain("Hikvision");
    expect(searchCatalog(catalog, "network").cats.map((c) => c.id)).toContain("net");
    expect(searchCatalog(catalog, "راوتر").subs.map((x) => x.id)).toContain("router");
  });
});

describe("pager", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps the ends and the neighbours when there are many (0 = gap)", () => {
    expect(pageWindow(1, 30)).toEqual([1, 2, 3, 4, 0, 30]);
    expect(pageWindow(15, 30)).toEqual([1, 0, 14, 15, 16, 0, 30]);
    expect(pageWindow(30, 30)).toEqual([1, 0, 27, 28, 29, 30]);
  });
});

describe("helpers", () => {
  it("formats money with thousands separators", () => {
    expect(formatMoney(1540000)).toBe("1,540,000");
    expect(formatMoney(950)).toBe("950");
  });

  it("forgives the case of a product id and nothing else", () => {
    expect(normalizeProductId("fz-012")).toBe("FZ-012");
    expect(catalog.byId.has(normalizeProductId("fz-586"))).toBe(true);
    expect(catalog.byId.has(normalizeProductId("fz-12"))).toBe(false);
  });
});

describe("storefront strings", () => {
  it("exist in both languages with the same keys and no empty values", () => {
    const a: Record<string, string> = ar.Site;
    const e: Record<string, string> = en.Site;
    expect(Object.keys(a).sort()).toEqual(Object.keys(e).sort());
    for (const v of [...Object.values(a), ...Object.values(e)]) expect(v.trim()).not.toBe("");
  });

  it("carry the same placeholders in both languages", () => {
    const holes = (v: string) => (v.match(/\{\{\w+\}\}/g) ?? []).sort().join(",");
    for (const [ns, a, e] of [
      ["Site", ar.Site, en.Site],
      ["HomeV2", ar.HomeV2, en.HomeV2],
    ] as const) {
      const arabic: Record<string, string> = a;
      const english: Record<string, string> = e;
      expect(Object.keys(arabic).sort(), ns).toEqual(Object.keys(english).sort());
      /** Plural forms (key_one) may drop the number in one language. */
      for (const k of Object.keys(arabic)) if (!/_one$/.test(k)) expect(holes(arabic[k]), `${ns}.${k}`).toBe(holes(english[k]));
    }
  });
});
