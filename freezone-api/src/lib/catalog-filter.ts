import type { Prisma } from "@prisma/client";
import type { Product, FacetAttributeDef } from "./data";
import { PRODUCTS, CATEGORIES } from "./data";
import { CLASSIFICATION_SEED_BY_SLUG } from "./classification/seed-presets";
import { ensureCategorySchemaComplete } from "./classification/ensure-category-schema";
import { prisma, isDatabaseConfigured, isDbConnectionError } from "./prisma";
import { mapDbToProduct, storefrontProductIncludeBase, type LocaleCode } from "./catalog";
import { categoryAttributeRowsToFacetDefs } from "./classification/sync";
import { FUZZY_SELECT_FILTER_KEYS, facetValueForFilter } from "./classification/legacy-spec-map";
import {
  getProductFilterToken,
  sanitizeFacetFilterToken,
} from "./classification/facet-filter-token";
import {
  normalizeAttributeType,
  productValueMatchesFilterSelectionForKey,
} from "./classification/values";
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
      .filter(Boolean)
      .map((v) => sanitizeFacetFilterToken(key, facetValueForFilter(key, v) ?? v))
      .filter((v): v is string => Boolean(v));
    if (vals.length) facets[key] = Array.from(new Set(vals));
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

/**
 * Map the requested sort to a SQL ORDER BY so ordering holds across the WHOLE
 * result set — previously the DB path always fetched by featured/id and only
 * re-sorted the fetched page in memory, so page 2 could contain items cheaper
 * than page 1 under "price-asc". `relevant` (name A→Z) is pushed to SQL via the
 * locale's name column (DB collation instead of localeCompare — acceptable for
 * an alphabetical sort, and the only way to keep it correct across pages).
 * Defaults mirror sortProducts(): `relevant` with a search query, else `featured`.
 */
export function buildCatalogOrderBy(
  sort: CatalogSort | undefined,
  hasQuery: boolean,
  locale: LocaleCode,
): Prisma.ProductOrderByWithRelationInput[] {
  const s = sort ?? (hasQuery ? "relevant" : "featured");
  switch (s) {
    case "price-asc":
      return [{ price: "asc" }, { id: "desc" }];
    case "price-desc":
      return [{ price: "desc" }, { id: "desc" }];
    case "date-new":
      return [{ id: "desc" }];
    case "date-old":
      return [{ id: "asc" }];
    case "relevant":
      return locale === "ar" ? [{ nameAr: "asc" }, { id: "desc" }] : [{ nameEn: "asc" }, { id: "desc" }];
    case "featured":
    default:
      return [{ featured: "desc" }, { id: "desc" }];
  }
}

/**
 * Category membership is tree-aware (one level — Category.parentId): a parent
 * category page lists its own products plus those homed on its children, via
 * primary or secondary category. Keep in sync with the storefront's
 * `productBelongsToCategoryTree` (freezone-web/src/lib/productCategoryMembership.ts).
 */
function categoryMembershipWhere(slug: string): Prisma.ProductWhereInput {
  return {
    OR: [
      { category: { slug } },
      { category: { parent: { slug } } },
      { secondaryCategories: { some: { category: { slug } } } },
      { secondaryCategories: { some: { category: { parent: { slug } } } } },
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

function buildAttributeValueCondition(
  attributeKey: string,
  selectedValue: string,
  type: AttributeType,
): Prisma.ProductAttributeValueWhereInput | null {
  const sel = selectedValue.trim();
  if (!sel) return null;

  if (type === "RANGE") {
    const range = sel.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (range) {
      const min = parseFloat(range[1]);
      const max = parseFloat(range[2]);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return {
          attributeKey,
          valueNumber: { gte: min, lte: max },
        };
      }
    }
    const exact = parseFloat(sel);
    if (Number.isFinite(exact)) {
      return {
        attributeKey,
        OR: [{ valueNumber: exact }, { valueString: { equals: String(exact), mode: "insensitive" } }],
      };
    }
    return null;
  }

  if (type === "BOOLEAN") {
    const wantTrue = sel === "true" || sel === "1" || sel === "yes";
    return {
      attributeKey,
      valueBoolean: wantTrue,
    };
  }

  if (type === "MULTI_SELECT") {
    return {
      attributeKey,
      OR: [
        { valueString: { equals: sel, mode: "insensitive" } },
        { valueJson: { array_contains: sel } },
      ],
    };
  }

  if (FUZZY_SELECT_FILTER_KEYS.has(attributeKey)) {
    return {
      attributeKey,
      valueString: { contains: sel, mode: "insensitive" },
    };
  }

  return {
    attributeKey,
    valueString: { equals: sel, mode: "insensitive" },
  };
}

function buildFacetProductWhere(
  facetEntries: [string, string[]][],
  facetDefs: FacetAttributeDef[],
): Prisma.ProductWhereInput | null {
  const andClauses: Prisma.ProductWhereInput[] = [];

  for (const [key, selected] of facetEntries) {
    if (!selected.length) continue;
    const def = facetDefs.find((d) => d.key === key);
    const type = normalizeAttributeType(def?.type ?? "SELECT");
    const orAttr: Prisma.ProductAttributeValueWhereInput[] = [];

    for (const sel of selected) {
      const cond = buildAttributeValueCondition(key, sel, type);
      if (cond) orAttr.push(cond);
    }
    if (orAttr.length) {
      andClauses.push({ attributeValues: { some: { OR: orAttr } } });
    }
  }

  if (!andClauses.length) return null;
  return andClauses.length === 1 ? andClauses[0] : { AND: andClauses };
}

function productMatchesFacetsInMemory(
  product: Product,
  facetDefs: FacetAttributeDef[],
  facets: Record<string, string[]>,
): boolean {
  for (const def of facetDefs) {
    const selected = facets[def.key];
    if (!selected?.length) continue;
    const filterVal = getProductFilterToken(product, def.key);
    const type = def.type ?? "SELECT";
    if (!productValueMatchesFilterSelectionForKey(def.key, filterVal, type, selected)) return false;
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

function computeFacetCounts(products: Product[], facetDefs: FacetAttributeDef[]): Record<string, FacetCount[]> {
  const out: Record<string, FacetCount[]> = {};
  for (const def of facetDefs) {
    if (def.filterable === false) continue;
    const map = new Map<string, number>();
    for (const p of products) {
      const v = getProductFilterToken(p, def.key);
      if (!v) continue;
      map.set(v, (map.get(v) ?? 0) + 1);
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
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!cat) return [];
  let rows = (cat.categoryAttributes ?? []) as CategoryAttributeRow[];
  rows = await ensureCategorySchemaComplete(prisma, cat.id, catSlug, rows);
  const filterable = rows.filter((a) => a.filterable === true && a.active !== false);
  if (filterable.length) {
    return categoryAttributeRowsToFacetDefs(filterable);
  }
  return [];
}

/** Facet option counts for the current base filters (facet selections excluded). */
export async function queryCatalogFacetCounts(
  input: CatalogFilterInput,
  facetDefs?: FacetAttributeDef[],
  baseWhere?: Prisma.ProductWhereInput,
): Promise<Record<string, FacetCount[]>> {
  if (!isDatabaseConfigured() || !input.cat) return {};

  const defs = facetDefs ?? (await loadCategoryFacetDefs(input.cat));
  if (!defs.length) return {};

  const poolInput = { ...input, facets: undefined };
  const where = baseWhere ?? buildBaseWhere(poolInput);
  try {
    const poolRows = await prisma.product.findMany({
      where,
      include: storefrontProductIncludeBase,
    });
    const poolProducts = poolRows.map((r) => mapDbToProduct(r, input.locale));
    return computeFacetCounts(poolProducts, defs);
  } catch (e) {
    if (!isDbConnectionError(e)) console.error("[catalog-filter] facet counts", e);
    return {};
  }
}

export async function queryCatalogProducts(input: CatalogFilterInput): Promise<CatalogProductsResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 48;
  const empty: CatalogProductsResult = { products: [], total: 0, page, pageSize, facets: {} };

  if (!isDatabaseConfigured()) {
    let list = [...PRODUCTS];
    if (input.cat) {
      /** Mirror categoryMembershipWhere: a parent slug also matches its children. */
      const treeSlugs = new Set([
        input.cat,
        ...CATEGORIES.filter((c) => c.parent === input.cat).map((c) => c.id),
      ]);
      list = list.filter((p) => treeSlugs.has(p.cat) || p.extraCats?.some((s) => treeSlugs.has(s)));
    }
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
    const facetDefs = input.cat
      ? (CLASSIFICATION_SEED_BY_SLUG[input.cat] ?? []).filter((a) => a.filterable === true)
      : [];
    if (input.facets && input.cat && facetDefs.length) {
      list = list.filter((p) => productMatchesFacetsInMemory(p, facetDefs, input.facets!));
    }
    list = sortProducts(list, input.sort, Boolean(input.q));
    const total = list.length;
    const start = (page - 1) * pageSize;
    return {
      products: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      facets: computeFacetCounts(list, facetDefs),
    };
  }

  try {
    const facetDefs = input.cat ? await loadCategoryFacetDefs(input.cat) : [];
    const facetEntries = Object.entries(input.facets ?? {}).filter(([, v]) => v.length);
    const baseWhere = buildBaseWhere(input);
    const facetWhere = facetEntries.length ? buildFacetProductWhere(facetEntries, facetDefs) : null;
    const where: Prisma.ProductWhereInput =
      facetWhere != null ? { AND: [baseWhere, facetWhere] } : baseWhere;

    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          ...storefrontProductIncludeBase,
          secondaryCategories: { include: { category: { select: { slug: true } } } },
        },
        orderBy: buildCatalogOrderBy(input.sort, Boolean(input.q), input.locale),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let products = rows.map((r) => mapDbToProduct(r, input.locale));

    const needsMemFacetFilter = facetEntries.some(([key]) => FUZZY_SELECT_FILTER_KEYS.has(key));
    if (needsMemFacetFilter && facetEntries.length && input.facets) {
      products = products.filter((p) => productMatchesFacetsInMemory(p, facetDefs, input.facets!));
    }

    /** Order comes from SQL (buildCatalogOrderBy) — re-sorting the page in
     *  memory would break the cross-page total order the query established. */

    const facetCounts = await queryCatalogFacetCounts(input, facetDefs, baseWhere);

    return { products, total, page, pageSize, facets: facetCounts };
  } catch (e) {
    if (!isDbConnectionError(e)) console.error("[catalog-filter]", e);
    return empty;
  }
}
