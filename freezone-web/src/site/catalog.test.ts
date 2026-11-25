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
  prepareCatalog,
  readFilters,
  relatedProducts,
  type SiteCatalog,
} from "./catalog";

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

  it("offers similar products of the same type, never the product itself", () => {
    const p = catalog.byId.get("FZ-001")!;
    const related = relatedProducts(catalog, p);
    expect(related.length).toBeLessThanOrEqual(5);
    expect(related.every((r) => r.sub === p.sub && r.id !== p.id)).toBe(true);
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
});
