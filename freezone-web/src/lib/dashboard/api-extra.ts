/**
 * Catalog-stream API additions (WS3-A).
 *
 * `lib/dashboard/api.ts` is owned by the foundation stream and mirrors the
 * frozen contracts — feature streams never edit it. Everything the catalog
 * pages need beyond those contracts (full product editor detail, review queue,
 * product comments, category stats, bulk price ops, upload-with-progress)
 * lives here and goes through the same `dashboardApi` request helper.
 */
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  dashboardApi,
  buildDashboardQuery,
  DashboardApiError,
  type CategoryAttributeDef,
  type Paginated,
  type ProductCatalogStatus,
  type ProductImage,
  type ProductVariant,
  type Role,
} from "./api";

// ─── Product editor detail ───────────────────────────────────────────────────

export type ProductAvailability = "IN_STOCK" | "OUT_OF_STOCK" | "COMING_SOON" | "ON_DEMAND";

/** Full row returned by `GET /api/admin/products/:id` (admin editor shape). */
export type ProductEditorDetail = {
  id: number;
  categoryId: number;
  brandId: number | null;
  brand: string;
  sku: string;
  model: string;
  slug: string | null;
  nameEn: string;
  nameAr: string;
  shortDescEn: string;
  shortDescAr: string;
  descEn: string;
  descAr: string;
  /** Stored as JSON — null/undefined when never set. */
  keyFeatures: string[] | null;
  whatsInBox: string[] | null;
  warranty: string;
  storage: string;
  model3d: string | null;
  price: number;
  oldPrice: number | null;
  salePrice: number | null;
  saleStartAt: string | null;
  saleEndAt: string | null;
  costPrice: number | null;
  priceUsd: number | null;
  quantity: number;
  lowStockThreshold: number;
  availability: ProductAvailability;
  inStock: boolean;
  catalogStatus: ProductCatalogStatus;
  published: boolean;
  featured: boolean;
  isNew: boolean;
  metaTitleEn: string | null;
  metaTitleAr: string | null;
  metaDescEn: string | null;
  metaDescAr: string | null;
  seoKeywords: string[] | null;
  weightKg: number | null;
  dimLengthCm: number | null;
  dimWidthCm: number | null;
  dimHeightCm: number | null;
  requiresSpecialHandling: boolean;
  excludedProvinces: string[] | null;
  internalNotes: string | null;
  reviewNotes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Display-spec map merged for the edit form (key → display string). */
  specs: Record<string, string>;
  displaySpecs: Record<string, string>;
  /** Filterable attribute values (attribute key → filter token). */
  filterSpecs: Record<string, string>;
  /** Attribute schema of the product's current primary category. */
  categoryAttributes: CategoryAttributeDef[];
  category: { id: number; slug: string; nameEn: string };
  brandRef: { id: number; nameEn: string; nameAr: string } | null;
  images: ProductImage[];
  variants: ProductVariant[];
  secondaryCategories?: Array<{ categoryId: number }>;
};

/**
 * One spec entry as accepted by `PATCH /api/admin/products/:id` —
 * a plain display string, or `{ display, filter }` for filterable attributes.
 */
export type SpecsPayloadEntry = string | { display: string; filter?: string };
export type SpecsPayload = Record<string, SpecsPayloadEntry>;

/** Patch body for the full-page editor (superset of `ProductUpdatePayload`). */
export type ProductEditorPatch = {
  categoryId?: number;
  brand?: string;
  brandId?: number | null;
  sku?: string;
  model?: string;
  quantity?: number;
  slug?: string | null;
  nameEn?: string;
  nameAr?: string;
  shortDescEn?: string;
  shortDescAr?: string;
  descEn?: string;
  descAr?: string;
  keyFeatures?: string[];
  whatsInBox?: string[];
  catalogStatus?: ProductCatalogStatus;
  availability?: ProductAvailability;
  price?: number;
  priceUsd?: number | null;
  costPrice?: number | null;
  salePrice?: number | null;
  saleStartAt?: string | null;
  saleEndAt?: string | null;
  lowStockThreshold?: number;
  metaTitleEn?: string | null;
  metaTitleAr?: string | null;
  metaDescEn?: string | null;
  metaDescAr?: string | null;
  seoKeywords?: string[];
  weightKg?: number | null;
  dimLengthCm?: number | null;
  dimWidthCm?: number | null;
  dimHeightCm?: number | null;
  requiresSpecialHandling?: boolean;
  excludedProvinces?: string[];
  internalNotes?: string | null;
  oldPrice?: number | null;
  warranty?: string;
  model3d?: string | null;
  specs?: SpecsPayload | null;
  featured?: boolean;
  isNew?: boolean;
  published?: boolean;
  secondaryCategoryIds?: number[] | null;
};

export type ProductImageWrite = {
  url: string;
  altTextEn?: string | null;
  altTextAr?: string | null;
  /** Import provenance — pass through on replace so it survives a save. */
  originalSourceUrl?: string | null;
};

export const productEditorApi = {
  /** GET /api/admin/products/:id — full editor detail (bare JSON shape). */
  detail: (id: number) => dashboardApi.get<ProductEditorDetail>(`/api/admin/products/${id}`),

  /** POST /api/admin/products — minimal create; the editor PATCHes the rest. */
  create: (payload: {
    categoryId: number;
    nameEn: string;
    nameAr?: string;
    price: number;
    published?: boolean;
  }) => dashboardApi.post<{ id: number }>("/api/admin/products", payload),

  /** PATCH /api/admin/products/:id — validated by `parseAdminProductPatch`. */
  update: (id: number, patch: ProductEditorPatch) =>
    dashboardApi.patch<{ ok: true }>(`/api/admin/products/${id}`, patch),

  /** PUT /api/admin/products/:id/images — replace the gallery in order (with alt text). */
  replaceImages: (id: number, images: ProductImageWrite[]) =>
    dashboardApi.put<{ ok: true; count: number }>(`/api/admin/products/${id}/images`, { images }),

  /** POST /api/admin/products/:id/duplicate. */
  duplicate: (id: number) =>
    dashboardApi.post<{ id: number }>(`/api/admin/products/${id}/duplicate`),

  /** DELETE /api/admin/products/:id — soft delete (archive + hide). */
  softDelete: (id: number) => dashboardApi.delete<{ ok: true }>(`/api/admin/products/${id}`),
};

// ─── Bulk price operations (additive to contract (i) actions) ────────────────

export type ProductsBulkPricePayload =
  | { action: "price_percent"; ids: number[]; percent: number }
  | { action: "price_fixed_delta"; ids: number[]; delta: number }
  | { action: "price_set"; ids: number[]; price: number };

export type ProductsBulkPriceResponse = {
  ok: true;
  action: ProductsBulkPricePayload["action"];
  affected: number;
};

export const productsBulkPriceApi = {
  /** POST /api/admin/products/bulk — transactional price ops over 1–200 ids. */
  run: (payload: ProductsBulkPricePayload) =>
    dashboardApi.post<ProductsBulkPriceResponse>("/api/admin/products/bulk", payload),
};

// ─── Review queue ────────────────────────────────────────────────────────────

export type ReviewQueueItem = {
  id: number;
  nameAr: string;
  nameEn: string;
  sku: string;
  price: number;
  quantity: number;
  catalogStatus: ProductCatalogStatus;
  submittedAt: string | null;
  updatedAt: string;
  createdById: number | null;
  category: { nameAr: string; nameEn: string } | null;
  brandRef: { nameAr: string; nameEn: string } | null;
  images: Array<{ url: string }>;
};

export type ReviewDecision = "publish" | "changes_requested";

export const reviewQueueApi = {
  /** GET /api/admin/review-queue — products pending review, oldest submission first. */
  list: (query: { page?: number; pageSize?: number } = {}) =>
    dashboardApi.get<Paginated<ReviewQueueItem>>(
      `/api/admin/review-queue${buildDashboardQuery(query)}`,
    ),

  /** PATCH /api/admin/review-queue — approve (publish) or send back with notes. */
  decide: (productId: number, action: ReviewDecision, reviewNotes?: string) =>
    dashboardApi.patch<{ catalogStatus: ProductCatalogStatus }>("/api/admin/review-queue", {
      productId,
      action,
      ...(reviewNotes?.trim() ? { reviewNotes: reviewNotes.trim() } : {}),
    }),
};

// ─── Product comments (review thread) ────────────────────────────────────────

export type ProductComment = {
  id: number;
  productId: number;
  userId: number;
  text: string;
  createdAt: string;
  user: { id: number; name: string; email: string; role: Role | string } | null;
};

export const productCommentsApi = {
  /** GET /api/admin/products/:id/comments — ascending thread. */
  list: async (productId: number): Promise<ProductComment[]> => {
    const res = await dashboardApi.get<{ comments: ProductComment[] }>(
      `/api/admin/products/${productId}/comments`,
    );
    return res.comments ?? [];
  },

  /** POST /api/admin/products/:id/comments — add a staff comment. */
  add: async (productId: number, text: string): Promise<ProductComment> => {
    const res = await dashboardApi.post<{ comment: ProductComment }>(
      `/api/admin/products/${productId}/comments`,
      { text },
    );
    return res.comment;
  },
};

// ─── Category stats ──────────────────────────────────────────────────────────

export type CategoryStats = {
  category: { id: number; nameAr: string; nameEn: string; slug: string };
  counts: { active: number; draft: number; archived: number; total: number };
  avgPrice: number;
  attributeCount: number;
  timeline: Array<{ month: string; count: number }>;
};

export const categoryStatsApi = {
  /** GET /api/admin/categories/:id/stats. */
  get: (categoryId: number) =>
    dashboardApi.get<CategoryStats>(`/api/admin/categories/${categoryId}/stats`),
};

// ─── Upload with progress ────────────────────────────────────────────────────

/**
 * Multipart upload to `/api/admin/upload` via XHR so callers get progress
 * events (the `fetch` helper in api.ts cannot report upload progress).
 */
export function uploadDashboardFileWithProgress(
  file: File,
  opts?: {
    register?: boolean;
    title?: string;
    onProgress?: (fraction: number) => void;
  },
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (opts?.register) form.append("registerLibrary", "true");
    if (opts?.title) form.append("title", opts.title);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", freezoneApiUrl("/api/admin/upload"));
    xhr.withCredentials = true;
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts?.onProgress) opts.onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new DashboardApiError(0, "NETWORK"));
    xhr.onload = () => {
      const body = (xhr.response ?? {}) as { url?: string; error?: string };
      if (xhr.status >= 200 && xhr.status < 300 && body.url) {
        resolve({ url: body.url });
      } else {
        reject(new DashboardApiError(xhr.status, body.error ?? `HTTP_${xhr.status}`));
      }
    };
    xhr.send(form);
  });
}
