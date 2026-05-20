import { freezoneApiUrl } from "@/lib/api-internal";
import type { AdminProductRow } from "@/components/admin/products-catalog/admin-product-types";
import { parseAdminProductsFromApi } from "@/components/admin/products-catalog/admin-product-types";

export type AdminProductsListParams = {
  page: number;
  pageSize: number;
  search: string;
  categoryId: string;
  published: "" | "published" | "draft";
  stock: "" | "in" | "out" | "unset";
  sort: string;
};

export type AdminProductsListResult = {
  items: AdminProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function fetchAdminProductsList(
  params: AdminProductsListParams,
): Promise<AdminProductsListResult> {
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
