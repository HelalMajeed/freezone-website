import { freezoneApiUrl } from "@/lib/api-internal";
import type { ProductEditorValues } from "@/lib/admin/product-editor-schema";

export type LoadedProduct = ProductEditorValues & {
  id: number;
  images: Array<{
    id: number;
    url: string;
    urlW200?: string | null;
    urlW400?: string | null;
    urlW800?: string | null;
    altTextAr?: string | null;
    altTextEn?: string | null;
    sortOrder: number;
    isCover?: boolean;
  }>;
  variants: Array<Record<string, unknown>>;
};

export async function fetchProductForEditor(id: number): Promise<LoadedProduct> {
  const res = await fetch(freezoneApiUrl(`/api/admin/products/${id}`), { credentials: "include" });
  if (!res.ok) throw new Error("تعذّر تحميل المنتج");
  const row = (await res.json()) as Record<string, unknown>;
  const secondary = Array.isArray(row.secondaryCategories)
    ? (row.secondaryCategories as { categoryId: number }[]).map((s) => s.categoryId)
    : [];
  const specs =
    row.specs && typeof row.specs === "object"
      ? Object.fromEntries(
          Object.entries(row.specs as Record<string, string>).map(([k, v]) => [k, String(v ?? "")]),
        )
      : {};
  return {
    id,
    nameAr: String(row.nameAr ?? ""),
    nameEn: String(row.nameEn ?? ""),
    slug: (row.slug as string | null) ?? null,
    sku: String(row.sku ?? ""),
    categoryId: Number(row.categoryId),
    secondaryCategoryIds: secondary,
    brandId: row.brandId != null ? Number(row.brandId) : null,
    brand: String(row.brand ?? ""),
    catalogStatus: (row.catalogStatus as LoadedProduct["catalogStatus"]) ?? "DRAFT",
    shortDescAr: String(row.shortDescAr ?? ""),
    shortDescEn: String(row.shortDescEn ?? ""),
    descAr: String(row.descAr ?? ""),
    descEn: String(row.descEn ?? ""),
    keyFeatures: Array.isArray(row.keyFeatures) ? (row.keyFeatures as string[]) : [],
    whatsInBox: Array.isArray(row.whatsInBox) ? (row.whatsInBox as string[]) : [],
    price: Number(row.price ?? 0),
    priceUsd: row.priceUsd != null ? Number(row.priceUsd) : null,
    costPrice: row.costPrice != null ? Number(row.costPrice) : null,
    salePrice: row.salePrice != null ? Number(row.salePrice) : null,
    saleStartAt: row.saleStartAt ? String(row.saleStartAt) : null,
    saleEndAt: row.saleEndAt ? String(row.saleEndAt) : null,
    quantity: Number(row.quantity ?? 0),
    lowStockThreshold: Number(row.lowStockThreshold ?? 5),
    availability: (row.availability as LoadedProduct["availability"]) ?? "IN_STOCK",
    prepTimeDays: Number(row.prepTimeDays ?? 0),
    specs,
    metaTitleAr: (row.metaTitleAr as string | null) ?? null,
    metaTitleEn: (row.metaTitleEn as string | null) ?? null,
    metaDescAr: (row.metaDescAr as string | null) ?? null,
    metaDescEn: (row.metaDescEn as string | null) ?? null,
    seoKeywords: Array.isArray(row.seoKeywords) ? (row.seoKeywords as string[]) : [],
    weightKg: row.weightKg != null ? Number(row.weightKg) : null,
    dimLengthCm: row.dimLengthCm != null ? Number(row.dimLengthCm) : null,
    dimWidthCm: row.dimWidthCm != null ? Number(row.dimWidthCm) : null,
    dimHeightCm: row.dimHeightCm != null ? Number(row.dimHeightCm) : null,
    requiresSpecialHandling: Boolean(row.requiresSpecialHandling),
    excludedProvinces: Array.isArray(row.excludedProvinces) ? (row.excludedProvinces as string[]) : [],
    internalNotes: (row.internalNotes as string | null) ?? null,
    sourceSupplier: (row.sourceSupplier as string | null) ?? null,
    purchaseInvoiceRef: (row.purchaseInvoiceRef as string | null) ?? null,
    published: Boolean(row.published),
    images: Array.isArray(row.images)
      ? (row.images as LoadedProduct["images"])
      : [],
    variants: [],
  };
}

export async function patchProductEditor(
  id: number,
  body: Partial<ProductEditorValues> & {
    specs?: Record<string, string>;
    submitForReview?: boolean;
    catalogStatus?: ProductEditorValues["catalogStatus"];
  },
): Promise<void> {
  const res = await fetch(freezoneApiUrl(`/api/admin/products/${id}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "تعذّر الحفظ");
  }
}

export async function checkFieldUnique(
  field: "slug" | "sku",
  value: string,
  excludeId?: number,
): Promise<boolean> {
  const q = new URLSearchParams({ field, value });
  if (excludeId != null) q.set("excludeId", String(excludeId));
  const res = await fetch(freezoneApiUrl(`/api/admin/products/check-unique?${q}`), {
    credentials: "include",
  });
  if (!res.ok) return true;
  const j = (await res.json()) as { data?: { unique?: boolean } };
  return j.data?.unique !== false;
}

export async function uploadProductImageFile(file: File): Promise<{
  url: string;
  urlW200: string;
  urlW400: string;
  urlW800: string;
}> {
  const form = new FormData();
  form.set("file", file);
  const res = await fetch(freezoneApiUrl("/api/admin/upload/product-image"), {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const j = (await res.json()) as { ok?: boolean; data?: { url: string; urlW200: string; urlW400: string; urlW800: string }; error?: string };
  if (!res.ok || !j.data) throw new Error(j.error ?? "فشل رفع الصورة");
  return j.data;
}
