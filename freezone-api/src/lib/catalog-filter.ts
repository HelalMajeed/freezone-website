import type { Prisma } from "@prisma/client";
import type { Product, FacetAttributeDef } from "./data";
import { PRODUCTS } from "./data";
import { prisma, isDatabaseConfigured, isDbConnectionError } from "./prisma";
import { mapDbToProduct, storefrontProductIncludeBase, type LocaleCode } from "./catalog";
import { categoryAttributeRowsToFacetDefs } from "./classification/sync";
import { readLegacySpecValue } from "./classification/legacy-spec-map";
import { normalizeAttributeType, productValueMatchesFilterSelection } from "./classification/values";
import type { AttributeType, CategoryAttributeRow } from "./classification/types";

export type CatalogSort =
  | "featured"
  | "relevant"
  | "price-asc"
  | "price-desc"
  | "date-new"
  | "date-old";

export type CatalogFilterInput = {
  locale: LocaleCode;
  cat?: string;
  brands?: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  isNew?: boolean;
  listingAge?: "all" | "new" | "older";
  q?: string;
  facets?: Record<string, string[]>;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
};

export type FacetCount = { value: string; count: number };

export type CatalogProductsResult = {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  facets: Record<string, FacetCount[]>;
};

const RESERVED_PARAMS = new Set([
  "locale",
  "cat",
  "brand",
  "price",
  "inStock",
  "onSale",
  "isNew",
  "featured",
  "listingAge",
  "q",
  "sort",
  "page",
  "pageSize",
]);

export function parseCatalogFilterFromUrl(url: string): CatalogFilterInput {
  const sp = new URL(url).searchParams;
  const locale = sp.get("locale") === "ar" ? "ar" : "en";
  const cat = sp.get("cat")?.trim() || undefined;
  const brands = sp.getAll("brand").flatMap((b) => b.split(",")).map((b) => b.trim()).filter(Boolean);
  const priceRaw = sp.get("price");
  let priceMin: number | undefined;
  let priceMax: number | undefined;
  if (priceRaw) {
    const [minS, maxS] = priceRaw.split("-", 2);
    const min = parseFloat(minS?.trim() ?? "");
    const max = parseFloat(maxS?.trim() ?? "");
    if (Number.isFinite(min) && min > 0) priceMin = min;
    if (Number.isFinite(max) && max > 0) priceMax = max;
  }
  const facets: Record<string, string[]> = {};
  sp.forEach((value, key) => {
    if (RESERVED_PARAMS.has(key)) return;
    const vals = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (vals.length) facets[key] = vals;
  });
  const sort = (sp.get("sort") as CatalogSort | null) ?? undefined;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") ?? "48", 10) || 48));
  const listingAge = (sp.get("listingAge") as CatalogFilterInput["listingAge"]) ?? undefined;
  const isNewParam = sp.get("isNew");
  const isNew =
    isNewParam === "true" ? true : isNewParam === "false" ? false : listingAge === "new" ? true : undefined;

  return {
    locale,
    cat,
    brands: brands.length ? Array.from(new Set(brands)) : undefined,
    priceMin,
    priceMax,
    inStock: sp.get("inStock") === "true" ? true : undefined,
    onSale: sp.get("onSale") === "true" ? true : undefined,
    featured: sp.get("featured") === "true" ? true : undefined,
    isNew,
    listingAge: listingAge ?? (isNew === true ? "new" : isNew === false ? "older" : undefined),
    q: sp.get("q")?.trim() || undefined,
    facets: Object.keys(facets).length ? facets : undefined,
    sort: sort && isCatalogSort(sort) ? sort : undefined,
    page,
    pageSize,
  };
}

function isCatalogSort(v: string): v is CatalogSort {
  return ["featured", "relevant", "price-asc", "price-desc", "date-new", "date-old"].includes(v);
}

function categoryMembershipWhere(slug: string): Prisma.ProductWhereInput {
  return {
    OR: [
      { category: { slug } },
      { secondaryCategories: { some: { category: { slug } } } },
    ],
  };
}

function buildBaseWhere(input: CatalogFilterInput): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ published: true }];
  if (input.cat) and.push(categoryMembershipWhere(input.cat));
  if (input.brands?.length) {
    and.push({
      OR: [
        { brand: { in: input.brands, mode: "insensitive" } },
        { brandRef: { nameEn: { in: input.brands, mode: "insensitive" } } },
        { brandRef: { nameAr: { in: input.brands, mode: "insensitive" } } },
      ],
    });
  }
  if (input.priceMin != null || input.priceMax != null) {
    and.push({
      price: {
        ...(input.priceMin != null ? { gte: Math.round(input.priceMin) } : {}),
        ...(input.priceMax != null ? { lte: Math.round(input.priceMax) } : {}),
      },
    });
  }
  if (input.inStock) and.push({ inStock: true, quantity: { gt: 0 } });
  if (input.onSale) and.push({ oldPrice: { not: null } });
  if (input.featured) and.push({ featured: true });
  if (input.isNew === true) and.push({ isNew: true });
  if (input.listingAge === "older" || input.isNew === false) and.push({ isNew: false });
  if (input.q) {
    const q = input.q;
    and.push({
      OR: [
        { nameEn: { contains: q, mode: "insensitive" } },
        { nameAr: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { descEn: { contains: q, mode: "insensitive" } },
        { descAr: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  return and.length === 1 ? and[0] : { AND: and };
}

function facetAttributeValueWhere(
  key: string,
  type: AttributeType,
  selected: string[],
): Prisma.ProductAttributeValueWhereInput | null {
  if (!selected.length) return null;

  if (type === "BOOLEAN") {
    const bools: boolean[] = [];
    for (const s of selected) {
      const w = s.trim().toLowerCase();
      if (w === "true" || w === "yes" || w === "1") bools.push(true);
      if (w === "false" || w === "no" || w === "0") bools.push(false);
    }
    if (!bools.length) return null;
    return {
      attributeKey: key,
      OR: bools.map((valueBoolean) => ({ valueBoolean })),
    };
  }

  if (type === "RANGE") {
    const or: Prisma.ProductAttributeValueWhereInput[] = [];
    for (const sel of selected) {
      const m = sel.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
      if (m) {
        or.push({
          attributeKey: key,
          valueNumber: { gte: parseFloat(m[1]), lte: parseFloat(m[2]) },
        });
        continue;
      }
      const n = parseFloat(sel);
      if (Number.isFinite(n)) or.push({ attributeKey: key, valueNumber: n });
    }
    return or.length ? { OR: or } : null;
  }

  if (type === "MULTI_SELECT") {
    return {
      attributeKey: key,
      OR: selected.map((v) => ({
        valueString: { contains: v, mode: "insensitive" },
      })),
    };
  }

  return {
    attributeKey: key,
    OR: selected.flatMap((v) => {
      const clauses: Prisma.ProductAttributeValueWhereInput[] = [
        { valueString: { equals: v, mode: "insensitive" } },
      ];
      const n = parseFloat(v);
      if (Number.isFinite(n)) clauses.push({ valueNumber: n });
      return clauses;
    }),
  };
}

function facetDisplayForProduct(product: Product, catSlug: string, facetKey: string): string | undefined {
  const direct = product.specs?.[facetKey]?.trim();
  if (direct) return direct;
  return readLegacySpecValue(product.specs, catSlug, facetKey);
}

function productMatchesFacetsInMemory(
  product: Product,
  catSlug: string,
  facetDefs: FacetAttributeDef[],
  facets: Record<string, string[]>,
): boolean {
  for (const def of facetDefs) {
    const selected = facets[def.key];
    if (!selected?.length) continue;
    const display = facetDisplayForProduct(product, catSlug, def.key);
    const type = def.type ?? "SELECT";
    if (!productValueMatchesFilterSelection(display, type, selected)) return false;
  }
  return true;
}

function sortProducts(products: Product[], sort: CatalogSort | undefined, hasQuery: boolean): Product[] {
  const arr = [...products];
  const s = sort ?? (hasQuery ? "relevant" : "featured");
  switch (s) {
    case "price-asc":
      return arr.sort((a, b) => a.price - b.price);
    case "price-desc":
      return arr.sort((a, b) => b.price - a.price);
    case "date-new":
      return arr.sort((a, b) => b.id - a.id);
    case "date-old":
      return arr.sort((a, b) => a.id - b.id);
    case "featured":
      return arr.sort((a, b) => (b.featured === a.featured ? 0 : b.featured ? 1 : -1));
    case "relevant":
    default:
      return arr.sort((a, b) => a.name.localeCompare(b.name));
  }
}

function computeFacetCounts(
  products: Product[],
  catSlug: string,
  facetDefs: FacetAttributeDef[],
): Record<string, FacetCount[]> {
  const out: Record<string, FacetCount[]> = {};
  for (const def of facetDefs) {
    if (def.filterable === false) continue;
    const map = new Map<string, number>();
    for (const p of products) {
      const v = facetDisplayForProduct(p, catSlug || p.cat, def.key);
      if (!v?.trim()) continue;
      map.set(v.trim(), (map.get(v.trim()) ?? 0) + 1);
    }
    out[def.key] = Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
  }
  return out;
}

async function loadCategoryFacetDefs(catSlug: string): Promise<FacetAttributeDef[]> {
  const cat = await prisma.category.findFirst({
    where: { slug: catSlug },
    include: {
      categoryAttributes: {
        where: { filterable: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!cat) return [];
  const attrs = (cat.categoryAttributes ?? []).filter(
    (a) => (a as CategoryAttributeRow & { active?: boolean }).active !== false,
  );
  if (attrs.length) {
    return categoryAttributeRowsToFacetDefs(attrs as CategoryAttributeRow[]);
  }
  return [];
}

export async function queryCatalogProducts(input: CatalogFilterInput): Promise<CatalogProductsResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 48;
  const empty: CatalogProductsResult = { products: [], total: 0, page, pageSize, facets: {} };

  if (!isDatabaseConfigured()) {
    let list = [...PRODUCTS];
    if (input.cat) list = list.filter((p) => p.cat === input.cat || p.extraCats?.includes(input.cat!));
    if (input.brands?.length) list = list.filter((p) => input.brands!.includes(p.brand));
    if (input.inStock) list = list.filter((p) => p.inStock);
    if (input.onSale) list = list.filter((p) => p.oldPrice != null);
    if (input.featured) list = list.filter((p) => p.featured);
    if (input.isNew === true) list = list.filter((p) => p.isNew);
    if (input.listingAge === "older") list = list.filter((p) => !p.isNew);
    if (input.priceMin != null) list = list.filter((p) => p.price >= input.priceMin!);
    if (input.priceMax != null) list = list.filter((p) => p.price <= input.priceMax!);
    if (input.q) {
      const q = input.q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q),
      );
    }
    const facetDefs: FacetAttributeDef[] = [];
    if (input.facets && input.cat) {
      list = list.filter((p) => productMatchesFacetsInMemory(p, input.cat ?? p.cat, facetDefs, input.facets!));
    }
    list = sortProducts(list, input.sort, Boolean(input.q));
    const total = list.length;
    const start = (page - 1) * pageSize;
    const products = list.slice(start, start + pageSize);
    return {
      products,
      total,
      page,
      pageSize,
      facets: computeFacetCounts(list, input.cat ?? "", facetDefs),
    };
  }

  try {
    const facetDefs = input.cat ? await loadCategoryFacetDefs(input.cat) : [];
    const typeByKey = new Map(facetDefs.map((d) => [d.key, normalizeAttributeType(d.type ?? "SELECT")]));

    const baseWhere = buildBaseWhere(input);
    const facetEntries = Object.entries(input.facets ?? {}).filter(([, v]) => v.length);

    const and: Prisma.ProductWhereInput[] = [baseWhere];
    for (const [key, selected] of facetEntries) {
      const type = typeByKey.get(key) ?? "SELECT";
      const attrWhere = facetAttributeValueWhere(key, type, selected);
      if (attrWhere) {
        and.push({ attributeValues: { some: attrWhere } });
      }
    }

    const where: Prisma.ProductWhereInput = and.length === 1 ? and[0] : { AND: and };

    let rows;
    try {
      rows = await prisma.product.findMany({
        where,
        include: {
          ...storefrontProductIncludeBase,
          secondaryCategories: { include: { category: { select: { slug: true } } } },
        },
        orderBy: { id: "asc" },
      });
    } catch {
      rows = await prisma.product.findMany({
        where: baseWhere,
        include: storefrontProductIncludeBase,
        orderBy: { id: "asc" },
      });
    }

    let products = rows.map((r) => mapDbToProduct(r, input.locale));

    if (facetEntries.length) {
      const defsForMem =
        facetDefs.length > 0
          ? facetDefs
          : facetEntries.map(([key]) => ({
              key,
              name_en: key,
              name_ar: key,
              type: typeByKey.get(key) ?? ("SELECT" as AttributeType),
              filterable: true,
            }));
      products = products.filter((p) =>
        productMatchesFacetsInMemory(p, input.cat ?? p.cat, defsForMem, input.facets!),
      );
    }

    products = sortProducts(products, input.sort, Boolean(input.q));
    const facetCounts = computeFacetCounts(products, input.cat ?? "", facetDefs);
    const total = products.length;
    const start = (page - 1) * pageSize;
    const pageProducts = products.slice(start, start + pageSize);

    return { products: pageProducts, total, page, pageSize, facets: facetCounts };
  } catch (e) {
    if (!isDbConnectionError(e)) console.error("[catalog-filter]", e);
    return empty;
  }
}
