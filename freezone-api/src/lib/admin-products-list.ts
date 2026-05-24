import type { Prisma } from "@prisma/client";

export type AdminProductsListQuery = {
  page: number;
  pageSize: number;
  search: string;
  categoryId: number | null;
  brand: string;
  published: boolean | null;
  /** @deprecated use stockMode */
  inStock: boolean | null;
  stockMode: "in" | "out" | "unset" | null;
  /** "active" (default, hides soft-deleted) | "deleted" (only) | "all" */
  deletedMode: "active" | "deleted" | "all";
  sort: "id_desc" | "id_asc" | "price_asc" | "price_desc" | "name_asc";
};

export function parseAdminProductsListQuery(url: URL): AdminProductsListQuery {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25));
  const search = (url.searchParams.get("search") ?? url.searchParams.get("q") ?? "").trim();
  const catRaw = url.searchParams.get("categoryId") ?? url.searchParams.get("cat");
  const categoryId = catRaw && /^\d+$/.test(catRaw) ? parseInt(catRaw, 10) : null;
  const brand = (url.searchParams.get("brand") ?? "").trim();
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
    sortRaw === "name_asc"
      ? sortRaw
      : "id_desc";
  const deletedRaw = url.searchParams.get("deleted");
  const deletedMode: AdminProductsListQuery["deletedMode"] =
    deletedRaw === "all" ? "all" : deletedRaw === "only" || deletedRaw === "deleted" ? "deleted" : "active";
  return { page, pageSize, search, categoryId, brand, published, inStock, stockMode, deletedMode, sort };
}

export function adminProductsWhere(q: AdminProductsListQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (q.deletedMode === "active") where.deletedAt = null;
  else if (q.deletedMode === "deleted") where.deletedAt = { not: null };
  if (q.categoryId != null) where.categoryId = q.categoryId;
  if (q.brand) where.brand = { contains: q.brand, mode: "insensitive" };
  if (q.published !== null) where.published = q.published;
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
    default:
      return { id: "desc" };
  }
}
