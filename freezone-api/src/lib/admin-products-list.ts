import type { Prisma, ProductCatalogStatus } from "@prisma/client";
import { ACTIVE_PRODUCT_WHERE } from "./admin-product-scope";

const CATALOG_STATUSES: ProductCatalogStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "PUBLISHED",
  "ARCHIVED",
];

export type AdminProductsListQuery = {
  page: number;
  pageSize: number;
  search: string;
  categoryId: number | null;
  brand: string;
  brandId: number | null;
  published: boolean | null;
  catalogStatus: ProductCatalogStatus | null;
  /** @deprecated use stockMode */
  inStock: boolean | null;
  stockMode: "in" | "out" | "unset" | null;
  priceMin: number | null;
  priceMax: number | null;
  quantityMin: number | null;
  quantityMax: number | null;
  createdById: number | null;
  /** "active" (default, hides soft-deleted) | "deleted" (only) | "all" */
  deletedMode: "active" | "deleted" | "all";
  smartFilter: "no_images" | "no_desc" | "zero_price" | "low_stock" | "ready_publish" | null;
  sort: "id_desc" | "id_asc" | "price_asc" | "price_desc" | "name_asc" | "updated_desc";
};

export function parseAdminProductsListQuery(url: URL): AdminProductsListQuery {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25));
  const search = (url.searchParams.get("search") ?? url.searchParams.get("q") ?? "").trim();
  const catRaw = url.searchParams.get("categoryId") ?? url.searchParams.get("cat");
  const categoryId = catRaw && /^\d+$/.test(catRaw) ? parseInt(catRaw, 10) : null;
  const brand = (url.searchParams.get("brand") ?? "").trim();
  const brandIdRaw = url.searchParams.get("brandId");
  const brandId = brandIdRaw && /^\d+$/.test(brandIdRaw) ? parseInt(brandIdRaw, 10) : null;
  const catalogRaw = url.searchParams.get("catalogStatus");
  const catalogStatus =
    catalogRaw && (CATALOG_STATUSES as string[]).includes(catalogRaw)
      ? (catalogRaw as ProductCatalogStatus)
      : null;
  const priceMinRaw = url.searchParams.get("priceMin");
  const priceMaxRaw = url.searchParams.get("priceMax");
  const priceMin = priceMinRaw && /^\d+$/.test(priceMinRaw) ? parseInt(priceMinRaw, 10) : null;
  const priceMax = priceMaxRaw && /^\d+$/.test(priceMaxRaw) ? parseInt(priceMaxRaw, 10) : null;
  const quantityMinRaw = url.searchParams.get("quantityMin");
  const quantityMaxRaw = url.searchParams.get("quantityMax");
  const quantityMin =
    quantityMinRaw && /^\d+$/.test(quantityMinRaw) ? parseInt(quantityMinRaw, 10) : null;
  const quantityMax =
    quantityMaxRaw && /^\d+$/.test(quantityMaxRaw) ? parseInt(quantityMaxRaw, 10) : null;
  const createdByRaw = url.searchParams.get("createdById");
  const createdById =
    createdByRaw && /^\d+$/.test(createdByRaw) ? parseInt(createdByRaw, 10) : null;
  const publishedRaw = url.searchParams.get("published") ?? url.searchParams.get("status");
  let published: boolean | null = null;
  if (publishedRaw === "published" || publishedRaw === "true") published = true;
  else if (publishedRaw === "draft" || publishedRaw === "false") published = false;
  const stockRaw = url.searchParams.get("stock") ?? url.searchParams.get("inStock");
  let inStock: boolean | null = null;
  let stockMode: "in" | "out" | "unset" | null = null;
  if (stockRaw === "in" || stockRaw === "true") stockMode = "in";
  else if (stockRaw === "out" || stockRaw === "false") stockMode = "out";
  else if (stockRaw === "unset" || stockRaw === "unknown") stockMode = "unset";
  const sortRaw = url.searchParams.get("sort") ?? "id_desc";
  const sort: AdminProductsListQuery["sort"] =
    sortRaw === "id_asc" ||
    sortRaw === "price_asc" ||
    sortRaw === "price_desc" ||
    sortRaw === "name_asc" ||
    sortRaw === "updated_desc"
      ? sortRaw
      : "id_desc";
  const deletedRaw = url.searchParams.get("deleted");
  const deletedMode: AdminProductsListQuery["deletedMode"] =
    deletedRaw === "all" ? "all" : deletedRaw === "only" || deletedRaw === "deleted" ? "deleted" : "active";
  const smartRaw = url.searchParams.get("smartFilter");
  const smartFilter: AdminProductsListQuery["smartFilter"] =
    smartRaw === "no_images" ||
    smartRaw === "no_desc" ||
    smartRaw === "zero_price" ||
    smartRaw === "low_stock" ||
    smartRaw === "ready_publish"
      ? smartRaw
      : null;
  return {
    page,
    pageSize,
    search,
    categoryId,
    brand,
    brandId,
    published,
    catalogStatus,
    inStock,
    stockMode,
    priceMin,
    priceMax,
    quantityMin,
    quantityMax,
    createdById,
    deletedMode,
    smartFilter,
    sort,
  };
}

export function adminProductsWhere(q: AdminProductsListQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (q.deletedMode === "active") Object.assign(where, ACTIVE_PRODUCT_WHERE);
  else if (q.deletedMode === "deleted") where.deletedAt = { not: null };
  if (q.categoryId != null) where.categoryId = q.categoryId;
  if (q.brandId != null) where.brandId = q.brandId;
  else if (q.brand) where.brand = { contains: q.brand, mode: "insensitive" };
  if (q.catalogStatus != null) where.catalogStatus = q.catalogStatus;
  else if (q.published !== null) where.published = q.published;
  if (q.createdById != null) where.createdById = q.createdById;
  if (q.priceMin != null || q.priceMax != null) {
    where.price = {};
    if (q.priceMin != null) (where.price as { gte?: number }).gte = q.priceMin;
    if (q.priceMax != null) (where.price as { lte?: number }).lte = q.priceMax;
  }
  if (q.quantityMin != null || q.quantityMax != null) {
    where.quantity = {};
    if (q.quantityMin != null) (where.quantity as { gte?: number }).gte = q.quantityMin;
    if (q.quantityMax != null) (where.quantity as { lte?: number }).lte = q.quantityMax;
  }
  if (q.stockMode === "in") {
    where.inStock = true;
    where.quantity = { gt: 0 };
  } else if (q.stockMode === "out") {
    where.inStock = false;
  } else if (q.stockMode === "unset") {
    where.inStock = true;
    where.quantity = { lte: 0 };
  } else if (q.inStock !== null) {
    where.inStock = q.inStock;
  }
  if (q.smartFilter === "no_images") {
    where.images = { none: {} };
  } else if (q.smartFilter === "no_desc") {
    where.OR = [{ descAr: "" }, { descEn: "" }];
  } else if (q.smartFilter === "zero_price") {
    where.price = 0;
  } else if (q.smartFilter === "low_stock") {
    where.inStock = true;
    where.quantity = { gt: 0, lt: 5 };
  } else if (q.smartFilter === "ready_publish") {
    where.catalogStatus = "DRAFT";
    where.price = { gt: 0 };
    where.images = { some: {} };
  }
  if (q.search) {
    const s = q.search;
    const idNum = /^\d+$/.test(s) ? parseInt(s, 10) : null;
    where.OR = [
      { nameEn: { contains: s, mode: "insensitive" } },
      { nameAr: { contains: s, mode: "insensitive" } },
      { brand: { contains: s, mode: "insensitive" } },
      { sku: { contains: s, mode: "insensitive" } },
      { model: { contains: s, mode: "insensitive" } },
      ...(idNum != null ? [{ id: idNum }] : []),
    ];
  }
  return where;
}

export function adminProductsOrderBy(sort: AdminProductsListQuery["sort"]): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "id_asc":
      return { id: "asc" };
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "name_asc":
      return { nameEn: "asc" };
    case "updated_desc":
      return { updatedAt: "desc" };
    default:
      return { id: "desc" };
  }
}
