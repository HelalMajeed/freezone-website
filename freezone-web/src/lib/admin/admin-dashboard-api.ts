import { freezoneApiUrl, getInternalApiFetchSignal } from "@/lib/api-internal";

export type AdminDashboardPayload = {
  dbConnected?: boolean;
  connectionFailed?: boolean;
  meta?: {
    catalogScope: string;
    generatedAt: string;
  };
  stats: {
    totalProducts: number;
    activeProducts: number;
    publishedProducts: number;
    draftProducts: number;
    deletedProducts: number;
    staleImportDrafts: number;
    inStockProducts: number;
    outOfStockProducts: number;
    stockNotSetProducts: number;
    categoriesCount: number;
    brandsCount: number;
    productsMissingSpecs: number;
    productsMissingImages: number;
    invalidFilterValues: number;
    categoriesWithoutAttributes: number;
    productsLegacySpecsOnly: number;
    orderCount: number;
    mediaCount: number;
    lowStock: number;
    pendingOrders: number;
  };
  recentProducts: {
    id: number;
    nameEn: string;
    nameAr: string;
    published: boolean;
    inStock: boolean;
    quantity: number;
    updatedAt: string;
    categorySlug: string;
    categoryName: string;
    imageUrl: string | null;
  }[];
  categoryHealth: {
    categoryId: number;
    slug: string;
    name: string;
    productCount: number;
    attributeCount: number;
    filterableAttributes: number;
    displaySpecAttributes: number;
    productsMissingSpecs: number;
    status: "healthy" | "warning" | "empty";
  }[];
  warnings: { level: "warning" | "error"; message: string; href?: string }[];
};

export async function fetchAdminDashboard(): Promise<AdminDashboardPayload> {
  const res = await fetch(freezoneApiUrl("/api/admin/dashboard"), {
    credentials: "include",
    cache: "no-store",
    signal: getInternalApiFetchSignal(),
  });
  if (res.status === 401) throw new Error("401");
  if (!res.ok) throw new Error("bad");
  return res.json() as Promise<AdminDashboardPayload>;
}

export type DataQualityTab =
  | "missing_specs"
  | "invalid_filters"
  | "missing_images"
  | "categories_without_attributes"
  | "legacy_specs"
  | "missing_brand";

export async function fetchAdminDataQuality(tab: DataQualityTab, page = 1) {
  const res = await fetch(
    freezoneApiUrl(`/api/admin/data-quality?tab=${encodeURIComponent(tab)}&page=${page}&limit=25`),
    { credentials: "include", cache: "no-store", signal: getInternalApiFetchSignal() },
  );
  if (res.status === 401) throw new Error("401");
  if (!res.ok) throw new Error("bad");
  return res.json() as Promise<{
    tab: string;
    page: number;
    total: number;
    items: {
      productId: number;
      nameEn: string;
      categorySlug: string;
      categoryName: string;
      published: boolean;
      issue: string;
      detail?: string;
      attributeKey?: string;
      suggestedFix?: string;
    }[];
    summary: Record<string, number>;
  }>;
}

export async function fetchClassificationPreview(categorySlug: string) {
  const res = await fetch(
    freezoneApiUrl(
      `/api/admin/classification-preview?categorySlug=${encodeURIComponent(categorySlug)}&limit=30`,
    ),
    { credentials: "include", cache: "no-store", signal: getInternalApiFetchSignal() },
  );
  if (res.status === 401) throw new Error("401");
  if (!res.ok) throw new Error("bad");
  return res.json();
}
