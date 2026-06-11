/**
 * Feature-stream API client extensions (WS3-A catalog + WS3-B operations).
 *
 * `lib/dashboard/api.ts` is owned by the foundation stream and mirrors the
 * frozen contracts — feature streams never edit it. Everything the catalog
 * and operations pages need beyond those contracts lives here and goes
 * through the same `dashboardApi` request helper:
 *  - full product editor detail, review queue, product comments, category
 *    stats, bulk price ops (catalog),
 *  - manual shipping-fee edit on an order (additive PATCH `{ shipping }`),
 *  - media library client (paginated list, register, import-from-URL),
 *  - XHR uploads with per-file progress (fetch has no upload progress).
 */
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  buildDashboardQuery,
  dashboardApi,
  DashboardApiError,
  type CategoryAttributeDef,
  type MediaAsset,
  type MediaKind,
  type MediaUpdatePayload,
  type OrderStatus,
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

// ─── Upload with progress (catalog editor) ───────────────────────────────────

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

// ─── Orders: manual shipping-fee edit ────────────────────────────────────────

export type OrderShippingUpdateResult = {
  id: number;
  status: OrderStatus;
  shipping: number;
  total: number;
};

/** Payment reconciliation states (API_CONTRACT §6). */
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export const ordersExtraApi = {
  /** PATCH /api/admin/orders/:id `{ shipping }` — total recomputed server-side. */
  updateShipping: (id: number, shipping: number) =>
    dashboardApi.patch<OrderShippingUpdateResult>(`/api/admin/orders/${id}`, { shipping }),

  /**
   * PATCH /api/admin/orders/:id `{ paymentStatus }` (API_CONTRACT §6) —
   * records an OrderStatusEvent note server-side.
   */
  updatePaymentStatus: (id: number, paymentStatus: PaymentStatus) =>
    dashboardApi.patch<{ id: number; paymentStatus: PaymentStatus }>(
      `/api/admin/orders/${id}`,
      { paymentStatus },
    ),
};

// ─── Customers admin (API_CONTRACT §5) ───────────────────────────────────────

export type CustomerListRow = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  isBlocked: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  orderCount: number;
  /** Integer IQD — excludes cancelled orders. */
  totalSpent: number;
};

export type CustomerDetail = Omit<CustomerListRow, "orderCount" | "totalSpent"> & {
  updatedAt: string;
};

/** Order rows on the customer detail (by customerId OR phone match). */
export type CustomerOrderRow = {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | string;
  fulfillment: string;
  paymentMethod: string;
  city: string;
  total: number;
  itemCount: number;
  createdAt: string;
};

export type CustomersListQuery = {
  search?: string;
  blocked?: "true" | "false";
  page?: number;
  pageSize?: number;
};

export const customersAdminApi = {
  /** GET /api/admin/customers — paginated, searchable, blocked filter. */
  list: (query: CustomersListQuery = {}) =>
    dashboardApi.get<{ customers: CustomerListRow[]; total: number }>(
      `/api/admin/customers${buildDashboardQuery(query)}`,
    ),

  /** GET /api/admin/customers/:id — detail + attributable orders. */
  detail: (id: number) =>
    dashboardApi.get<{ customer: CustomerDetail; orders: CustomerOrderRow[] }>(
      `/api/admin/customers/${id}`,
    ),

  /** PATCH /api/admin/customers/:id — SUPER_ADMIN only; blocking revokes sessions. */
  setBlocked: (id: number, isBlocked: boolean) =>
    dashboardApi.patch<{ customer: CustomerDetail }>(`/api/admin/customers/${id}`, { isBlocked }),
};

// ─── Customer-review moderation (API_CONTRACT §4) ────────────────────────────

export type ModerationReview = {
  id: number;
  productId: number;
  customerId: number | null;
  customerName: string;
  /** Moderation-only — never shown on the storefront. */
  phone: string | null;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: string;
  product: { id: number; slug: string | null; nameEn: string; nameAr: string } | null;
};

export type ModerationReviewsQuery = {
  status?: "pending" | "approved" | "all";
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ModerationReviewsResponse = {
  reviews: ModerationReview[];
  total: number;
  pendingCount: number;
};

export const reviewsModerationApi = {
  /** GET /api/admin/reviews — customer reviews (NOT the product review queue). */
  list: (query: ModerationReviewsQuery = {}) =>
    dashboardApi.get<ModerationReviewsResponse>(
      `/api/admin/reviews${buildDashboardQuery(query)}`,
    ),

  /** PATCH /api/admin/reviews/:id — approve / move back to pending. */
  setApproved: (id: number, isApproved: boolean) =>
    dashboardApi.patch<{ review: ModerationReview }>(`/api/admin/reviews/${id}`, { isApproved }),

  /** DELETE /api/admin/reviews/:id — permanent; product rating recomputed. */
  remove: (id: number) => dashboardApi.delete<{ ok: true }>(`/api/admin/reviews/${id}`),
};

// ─── Media library ───────────────────────────────────────────────────────────

export type MediaListQuery = {
  page?: number;
  pageSize?: number;
  /** Matches title / url / alt text (contains, case-insensitive). */
  q?: string;
  kind?: MediaKind;
};

export type MediaListResponse = Paginated<MediaAsset>;

export type MediaRegisterPayload = {
  url: string;
  kind?: MediaKind;
  mimeType?: string;
  title?: string;
  altAr?: string;
  altEn?: string;
  fileSize?: number;
};

export type ImportedImage = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  originalSourceUrl?: string;
};

export const mediaApi = {
  /** GET /api/admin/media?page=… — paginated envelope (additive over the legacy bare array). */
  list: (query: MediaListQuery = {}) =>
    dashboardApi.get<MediaListResponse>(
      `/api/admin/media${buildDashboardQuery({ ...query, page: query.page ?? 1 })}`,
    ),

  /** POST /api/admin/media — register an already-hosted file in the library. */
  register: (payload: MediaRegisterPayload) =>
    dashboardApi.post<MediaAsset>("/api/admin/media", payload),

  /** PATCH /api/admin/media/:id — title / alt / kind. */
  update: (id: number, payload: MediaUpdatePayload) =>
    dashboardApi.patch<{ ok: true }>(`/api/admin/media/${id}`, payload),

  /** DELETE /api/admin/media/:id — removes the library row (file stays on disk). */
  remove: (id: number) => dashboardApi.delete<{ ok: true }>(`/api/admin/media/${id}`),

  /**
   * POST /api/admin/media/import-image — server-side download of an external
   * image into `/uploads` (SSRF-guarded). Returns the hosted file metadata;
   * pair with {@link mediaApi.register} to add it to the library.
   */
  importImage: async (url: string): Promise<ImportedImage> => {
    const res = await dashboardApi.post<{ ok: true; image: ImportedImage }>(
      "/api/admin/media/import-image",
      { url },
    );
    return res.image;
  },
};

// ─── Upload with progress (media library XHR) ────────────────────────────────

export type UploadProgressResult = { url: string };

/**
 * Multipart upload to `/api/admin/upload` with upload-progress callbacks —
 * the fetch-based `uploadDashboardFile` cannot report progress. Registers the
 * file in the MediaAsset library when `opts.register` is true.
 */
export function uploadFileWithProgress(
  file: File,
  opts: { register?: boolean; title?: string; altAr?: string; altEn?: string },
  onProgress: (fraction: number) => void,
): Promise<UploadProgressResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (opts.register) form.append("registerLibrary", "true");
    if (opts.title) form.append("title", opts.title);
    if (opts.altAr) form.append("altAr", opts.altAr);
    if (opts.altEn) form.append("altEn", opts.altEn);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", freezoneApiUrl("/api/admin/upload"));
    xhr.withCredentials = true;
    xhr.responseType = "json";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(Math.min(1, e.loaded / e.total));
    };
    xhr.onerror = () => reject(new DashboardApiError(0, "NETWORK"));
    xhr.ontimeout = () => reject(new DashboardApiError(0, "TIMEOUT"));
    xhr.onload = () => {
      const body = (xhr.response ?? {}) as { url?: string; error?: string };
      if (xhr.status >= 200 && xhr.status < 300 && body.url) {
        onProgress(1);
        resolve({ url: body.url });
      } else {
        reject(new DashboardApiError(xhr.status, body.error ?? `HTTP_${xhr.status}`));
      }
    };
    xhr.send(form);
  });
}
