import type { AdminProductsListParams } from "@/lib/admin/admin-products-api";

export type SavedProductFilter = {
  id: string;
  name: string;
  params: Omit<AdminProductsListParams, "page">;
  createdAt: string;
};

const STORAGE_KEY = "admin-product-filters-v1";

function storageKey(userId: number | null): string {
  return `${STORAGE_KEY}:${userId ?? "legacy"}`;
}

export function loadSavedProductFilters(userId: number | null): SavedProductFilter[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedProductFilter[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProductFilter(userId: number | null, name: string, params: AdminProductsListParams): SavedProductFilter {
  const list = loadSavedProductFilters(userId);
  const entry: SavedProductFilter = {
    id: `f_${Date.now()}`,
    name: name.trim() || "فلتر",
    params: {
      pageSize: params.pageSize,
      search: params.search,
      categoryId: params.categoryId,
      published: params.published,
      stock: params.stock,
      sort: params.sort,
      catalogStatus: params.catalogStatus,
      brandId: params.brandId,
      priceMin: params.priceMin,
      priceMax: params.priceMax,
      quantityMin: params.quantityMin,
      quantityMax: params.quantityMax,
    },
    createdAt: new Date().toISOString(),
  };
  list.unshift(entry);
  localStorage.setItem(storageKey(userId), JSON.stringify(list.slice(0, 20)));
  return entry;
}

export function deleteSavedProductFilter(userId: number | null, id: string): void {
  const list = loadSavedProductFilters(userId).filter((f) => f.id !== id);
  localStorage.setItem(storageKey(userId), JSON.stringify(list));
}
