import { freezoneApiUrl } from "@/lib/api-internal";
import type { AdminProductRow } from "@/components/admin/products-catalog/admin-product-types";
import { parseAdminProductsFromApi } from "@/components/admin/products-catalog/admin-product-types";

export type CatalogStatusFilter =
  | ""
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "PUBLISHED"
  | "ARCHIVED";

export type AdminProductsListParams = {
  page: number;
  pageSize: number;
  search: string;
  categoryId: string;
  published: "" | "published" | "draft";
  stock: "" | "in" | "out" | "unset";
  sort: string;
  catalogStatus?: CatalogStatusFilter;
  brandId?: string;
  priceMin?: string;
  priceMax?: string;
  quantityMin?: string;
  quantityMax?: string;
  smartFilter?: string;
};

export type AdminProductsListResult = {
  items: AdminProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function buildSearchParams(params: AdminProductsListParams): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));
  if (params.search.trim()) sp.set("search", params.search.trim());
  if (params.categoryId) sp.set("categoryId", params.categoryId);
  if (params.published === "published") sp.set("published", "true");
  if (params.published === "draft") sp.set("published", "false");
  if (params.stock === "in") sp.set("stock", "in");
  if (params.stock === "out") sp.set("stock", "out");
  if (params.stock === "unset") sp.set("stock", "unset");
  if (params.sort) sp.set("sort", params.sort);
  if (params.catalogStatus) sp.set("catalogStatus", params.catalogStatus);
  if (params.brandId) sp.set("brandId", params.brandId);
  if (params.priceMin) sp.set("priceMin", params.priceMin);
  if (params.priceMax) sp.set("priceMax", params.priceMax);
  if (params.quantityMin) sp.set("quantityMin", params.quantityMin);
  if (params.quantityMax) sp.set("quantityMax", params.quantityMax);
  if (params.smartFilter) sp.set("smartFilter", params.smartFilter);
  return sp;
}

export async function fetchAdminProductsList(
  params: AdminProductsListParams,
): Promise<AdminProductsListResult> {
  const sp = buildSearchParams(params);
  const res = await fetch(freezoneApiUrl(`/api/admin/products?${sp}`), {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`products list ${res.status}`);
  const data = (await res.json()) as {
    items?: unknown;
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
  if (Array.isArray(data)) {
    const items = parseAdminProductsFromApi(data);
    return { items, total: items.length, page: 1, pageSize: items.length, totalPages: 1 };
  }
  const items = parseAdminProductsFromApi(data.items ?? []);
  return {
    items,
    total: data.total ?? items.length,
    page: data.page ?? params.page,
    pageSize: data.pageSize ?? params.pageSize,
    totalPages: data.totalPages ?? 1,
  };
}

export async function bulkAdminProductsAction(
  action:
    | "publish"
    | "unpublish"
    | "soft_delete"
    | "restore"
    | "change_category"
    | "price_percent"
    | "price_fixed_delta"
    | "price_set",
  ids: number[],
  extra?: { categoryId?: number; percent?: number; delta?: number; price?: number },
): Promise<{ affected: number }> {
  const res = await fetch(freezoneApiUrl("/api/admin/products/bulk"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ids, ...extra }),
  });
  const j = (await res.json()) as { affected?: number; error?: string };
  if (!res.ok) throw new Error(j.error ?? "bulk failed");
  return { affected: j.affected ?? 0 };
}

export function productsExportUrl(params: AdminProductsListParams, limit = 500): string {
  const sp = buildSearchParams({ ...params, page: 1, pageSize: limit });
  sp.set("limit", String(limit));
  return freezoneApiUrl(`/api/admin/products/export?${sp}`);
}

export async function duplicateAdminProduct(id: number): Promise<number> {
  const res = await fetch(freezoneApiUrl(`/api/admin/products/${id}/duplicate`), {
    method: "POST",
    credentials: "include",
  });
  const j = (await res.json()) as { ok?: boolean; data?: { id?: number }; error?: string };
  if (!res.ok || !j.data?.id) throw new Error(j.error ?? "duplicate failed");
  return j.data.id;
}
