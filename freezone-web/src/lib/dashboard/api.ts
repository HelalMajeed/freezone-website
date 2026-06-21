/**
 * Dashboard API client — uses project API base (VITE_API_URL / proxy).
 */
import { freezoneApiUrl, getInternalApiFetchSignal } from "@/lib/api-internal";

export class DashboardApiError extends Error {
  status: number;
  code: string;
  extra?: Record<string, unknown>;
  constructor(status: number, code: string, message?: string, extra?: Record<string, unknown>) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

/**
 * Fired (on `window`) whenever any dashboard API call returns 401 mid-session.
 * `DashboardGuard` listens for it and resets the auth store so the next render
 * bounces to /dashboard/login — giving the admin an in-app recovery path
 * instead of an endless stream of "UNAUTHORIZED" toasts. Callers still receive
 * the thrown `DashboardApiError` so they can show inline errors if they want.
 */
export const DASHBOARD_UNAUTHORIZED_EVENT = "fz:dashboard-unauthorized";

function notifyDashboardUnauthorized(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DASHBOARD_UNAUTHORIZED_EVENT));
  }
}

async function request<T>(method: string, path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : freezoneApiUrl(path);
  const headers: HeadersInit = {
    Accept: "application/json",
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers ?? {}),
  };
  const res = await fetch(url, {
    method,
    credentials: "include",
    cache: "no-store",
    signal: getInternalApiFetchSignal(),
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { ok: false, error: "BAD_JSON" };
  }

  if (!res.ok) {
    if (res.status === 401) notifyDashboardUnauthorized();
    const j = json as { error?: string; [k: string]: unknown };
    throw new DashboardApiError(res.status, j.error ?? `HTTP_${res.status}`, j.error, j);
  }

  const j = json as { ok?: boolean; data?: T; user?: T };
  if (j.data !== undefined) return j.data as T;
  if (j.user !== undefined) return j.user as T;
  return json as T;
}

export const dashboardApi = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

/**
 * Multipart upload to `/api/admin/upload`. The backend writes the file under
 * `/public/uploads/` and returns its public URL. Pass `register: true` to also
 * record the file in the `MediaAsset` library.
 */
export async function uploadDashboardFile(
  file: File,
  opts?: { register?: boolean; title?: string; altAr?: string; altEn?: string },
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  if (opts?.register) form.append("registerLibrary", "true");
  if (opts?.title) form.append("title", opts.title);
  if (opts?.altAr) form.append("altAr", opts.altAr);
  if (opts?.altEn) form.append("altEn", opts.altEn);
  const res = await fetch(freezoneApiUrl("/api/admin/upload"), {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    if (res.status === 401) notifyDashboardUnauthorized();
    const j = json as { error?: string };
    throw new DashboardApiError(res.status, j.error ?? `HTTP_${res.status}`, j.error, j as Record<string, unknown>);
  }
  return json as { url: string };
}

export type Role = "CATALOG_EDITOR" | "CATALOG_MANAGER" | "SUPER_ADMIN";

/** Legacy nav keys still accepted by hasRole() */
export type LegacyRoleAlias = "viewer" | "editor" | "admin" | "superadmin";

export type DashboardUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
};

export type DashboardUserDetail = DashboardUser & {
  active: boolean;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { sessions: number };
};

export type OverviewResponse = {
  kpis: {
    products: number;
    categories: number;
    brands: number;
    activeCoupons: number;
    ordersToday: number;
    revenueToday: number;
    ordersWeek: number;
    revenueWeek: number;
  };
  statusCounts: Record<string, number>;
  lowStock: Array<{
    id: number;
    nameEn: string;
    nameAr: string;
    sku: string;
    quantity: number;
    price: number;
    brand: string;
    images: { url: string }[];
  }>;
  topProducts: Array<{
    id: number;
    nameEn: string;
    nameAr: string;
    sales: number;
    price: number;
    rating: number;
    images: { url: string }[];
  }>;
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    status: string;
    customerName: string;
    total: number;
    createdAt: string;
    paymentMethod: string;
  }>;
  sparkline: Array<{ date: string; orders: number; revenue: number }>;
};

export type AuditEntry = {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  userEmail?: string | null;
  payload: unknown;
  createdAt: string;
};

export type Brand = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  logoUrl: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrandCreatePayload = {
  nameEn: string;
  nameAr?: string;
  slug?: string;
  logoUrl?: string | null;
  sortOrder?: number;
};

export type BrandUpdatePayload = Partial<BrandCreatePayload> & { active?: boolean };

// ─── Products ──────────────────────────────────────────────────────────────

/** Mirrors the Prisma `ProductCatalogStatus` enum. */
export type ProductCatalogStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "PUBLISHED"
  | "ARCHIVED";

export type ProductImage = {
  id: number;
  url: string;
  sortOrder: number;
  altTextEn?: string | null;
  altTextAr?: string | null;
};

/** A category reference embedded in a product row from `/api/admin/products`. */
export type ProductCategoryRef = {
  slug: string;
  nameEn: string;
  nameAr: string;
};

export type ProductBrandRef = {
  id?: number;
  slug?: string;
  nameEn: string;
  nameAr: string;
} | null;

/** Row shape returned by `GET /api/admin/products?page=...`. */
export type ProductListRow = {
  id: number;
  categoryId: number;
  brandId: number | null;
  brand: string;
  sku: string;
  model: string;
  nameEn: string;
  nameAr: string;
  slug: string | null;
  price: number;
  oldPrice: number | null;
  quantity: number;
  catalogStatus: ProductCatalogStatus;
  published: boolean;
  featured: boolean;
  isNew: boolean;
  inStock: boolean;
  deletedAt: string | null;
  updatedAt: string;
  createdAt: string;
  category: ProductCategoryRef;
  brandRef: ProductBrandRef;
  images: ProductImage[];
};

export type ProductsListResponse = {
  items: ProductListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Fields used by the dashboard form when fetching one product for edit. */
export type ProductDetail = ProductListRow & {
  descEn: string;
  descAr: string;
  shortDescEn: string;
  shortDescAr: string;
  warranty: string;
  storage: string;
  model3d: string | null;
};

export type ProductCreatePayload = {
  categoryId: number;
  nameEn: string;
  nameAr?: string;
  price: number;
  brandId?: number | null;
  brand?: string;
  sku?: string;
  model?: string;
  quantity?: number;
  descEn?: string;
  descAr?: string;
  oldPrice?: number | null;
  published?: boolean;
  featured?: boolean;
  isNew?: boolean;
  images?: string[];
};

/**
 * Patch body for `PATCH /api/admin/products/:id`. The backend validates with
 * `parseAdminProductPatch`; supplying `undefined` skips the field.
 */
export type ProductUpdatePayload = {
  categoryId?: number;
  nameEn?: string;
  nameAr?: string;
  price?: number;
  brandId?: number | null;
  brand?: string;
  sku?: string;
  model?: string;
  quantity?: number;
  descEn?: string;
  descAr?: string;
  oldPrice?: number | null;
  catalogStatus?: ProductCatalogStatus;
  published?: boolean;
  featured?: boolean;
  isNew?: boolean;
};

/** Minimal category shape for dropdowns / filters. */
export type CategoryOption = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  parentId: number | null;
  active: boolean;
};

/** Full category row returned by `GET /api/admin/categories`. */
export type CategoryFull = {
  id: number;
  parentId: number | null;
  slug: string;
  nameEn: string;
  nameAr: string;
  active: boolean;
  icon: string;
  color: string;
  backgroundImageUrl: string | null;
  sortOrder: number;
  /** Attribute schema set on the category — opaque here; editor lives in a later checkpoint. */
  categoryAttributes: unknown[];
  primaryProductCount: number;
  secondaryLinkCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryCreatePayload = {
  nameEn: string;
  nameAr?: string;
  slug?: string;
  parentId?: number | null;
  active?: boolean;
  icon?: string;
  color?: string;
  backgroundImageUrl?: string | null;
  sortOrder?: number;
};

export type CategoryUpdatePayload = Partial<CategoryCreatePayload>;

// ─── Orders ────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderLineItem = {
  id: number;
  productId: number | null;
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
  imageSnapshot: string | null;
};

export type Order = {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  fulfillment: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  addressLine: string;
  city: string;
  subtotal: number;
  shipping: number;
  total: number;
  couponCode: string | null;
  discountTotal: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderLineItem[];
};

// ─── Coupons ───────────────────────────────────────────────────────────────

export type CouponDiscountType = "percent" | "fixed_iqd";

export type Coupon = {
  id: number;
  code: string;
  labelAr: string;
  labelEn: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minSubtotal: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CouponPayload = {
  code: string;
  labelAr?: string;
  labelEn?: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  minSubtotal?: number;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
};

export type CouponUpdatePayload = Partial<CouponPayload>;

// ─── Media library ─────────────────────────────────────────────────────────

export type MediaKind = "image" | "video" | "model3d";

export type MediaAsset = {
  id: number;
  url: string;
  kind: MediaKind;
  mimeType: string;
  title: string;
  altAr: string;
  altEn: string;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MediaUpdatePayload = {
  title?: string;
  altAr?: string;
  altEn?: string;
  kind?: MediaKind;
};

// ─── Site config (Settings) ────────────────────────────────────────────────

export type SiteConfigPublic = {
  storeNameEn: string;
  storeNameAr: string;
  taglineEn: string;
  taglineAr: string;
  logoUrl: string | null;
  headerLogoHeightPx: number;
  phone: string;
  whatsapp: string;
  email: string;
  addressEn: string;
  addressAr: string;
  zainCashWallet: string;
  qiCardMerchantId: string;
  freeDeliveryThreshold: number;
  standardShippingFee: number;
  promoBarTextEn: string;
  promoBarTextAr: string;
  promoBarEnabled: boolean;
  maintenanceMode: boolean;
  metaTitleEn: string | null;
  metaTitleAr: string | null;
  metaDescriptionEn: string | null;
  metaDescriptionAr: string | null;
  seoKeywords: string | null;
  updatedAt: string;
};

export type SiteConfigUpdatePayload = Partial<Omit<SiteConfigPublic, "updatedAt">>;

// ─── Theme tokens (Design) ─────────────────────────────────────────────────

export type ButtonStyleToken = "solid" | "outline" | "ghost";

export type ThemeTokens = {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  surface: string;
  backgroundImage: string;
  cardRadius: string;
  buttonRadius: string;
  sectionSpacing: string;
  shadowCard: string;
  fontHeading: string;
  fontBody: string;
  headingScale: string;
  buttonStyle: ButtonStyleToken;
};

export type ThemeResponse = { tokens: ThemeTokens };

// ─── CMS entities ──────────────────────────────────────────────────────────

export type PromoBanner = {
  id: number;
  titleEn: string;
  titleAr: string;
  subEn: string;
  subAr: string;
  imageUrl: string;
  href: string;
  catSlug: string | null;
  sortOrder: number;
  active: boolean;
};

export type PromoBannerPayload = {
  titleEn: string;
  titleAr?: string;
  subEn?: string;
  subAr?: string;
  imageUrl: string;
  href?: string;
  catSlug?: string | null;
  sortOrder?: number;
  active?: boolean;
};

export type SocialLink = {
  id: number;
  platform: string;
  url: string;
  sortOrder: number;
  showInTopBar: boolean;
};

export type SocialLinkPayload = {
  platform: string;
  url: string;
  sortOrder?: number;
  showInTopBar?: boolean;
};

export type TrustBarItem = {
  id: number;
  textEn: string;
  textAr: string;
  iconKey: string;
  sortOrder: number;
};

export type TrustBarItemPayload = {
  textEn: string;
  textAr?: string;
  iconKey?: string;
  sortOrder?: number;
};

export type HomeSpotlight = {
  id: number;
  labelEn: string;
  labelAr: string;
  href: string;
  imageUrl: string | null;
  iconKey: string | null;
  sortOrder: number;
  active: boolean;
};

export type HomeSpotlightPayload = {
  labelEn: string;
  labelAr?: string;
  href?: string;
  imageUrl?: string | null;
  iconKey?: string | null;
  sortOrder?: number;
  active?: boolean;
};

export type HeroSlide = {
  id: number;
  sortOrder: number;
  layoutMode: string;
  badgeEn: string;
  badgeAr: string;
  titleLine1En: string;
  titleLine1Ar: string;
  titleLine2En: string;
  titleLine2Ar: string;
  descEn: string;
  descAr: string;
  imageUrl: string;
  primaryLabelEn: string;
  primaryLabelAr: string;
  primaryHref: string;
  secondaryLabelEn: string;
  secondaryLabelAr: string;
  secondaryHref: string;
  active: boolean;
};

export type HeroSlidePayload = Partial<Omit<HeroSlide, "id" | "layoutMode">> & {
  imageUrl: string;
};

export type ShowroomMediaItem = {
  id: number;
  kind: "image" | "video";
  url: string;
  titleEn: string | null;
  titleAr: string | null;
  sortOrder: number;
};

export type ShowroomMediaPayload = {
  kind?: "image" | "video";
  url: string;
  titleEn?: string | null;
  titleAr?: string | null;
  sortOrder?: number;
};

export type TickerItem = {
  id: number;
  textEn: string;
  textAr: string;
  iconSuffix: string | null;
  sortOrder: number;
};

export type TickerItemPayload = {
  textEn: string;
  textAr?: string;
  iconSuffix?: string | null;
  sortOrder?: number;
};

// ─── Data quality ──────────────────────────────────────────────────────────

export type DataQualityTab =
  | "invalid_filters"
  | "missing_specs"
  | "missing_image"
  | "missing_brand"
  | "missing_prices"
  | "duplicates"
  | "legacy_specs_only"
  | "no_attributes";

export type DataQualitySummary = {
  productsMissingSpecs: number;
  productsMissingImages: number;
  productsInvalidFilters: number;
  productsLegacySpecsOnly: number;
  productsMissingBrand: number;
  productsMissingPrice: number;
  productsDuplicate: number;
  categoriesWithoutAttributes: number;
};

export type DataQualityIssue = {
  productId: number;
  nameEn: string;
  nameAr: string;
  categorySlug: string;
  categoryName: string;
  published: boolean;
  issue: string;
  detail?: string;
  attributeKey?: string;
  suggestedFix?: string;
};

export type DataQualityResponse = {
  dbConnected: boolean;
  tab: DataQualityTab | string;
  page: number;
  limit: number;
  total: number;
  items: DataQualityIssue[];
  summary: Partial<DataQualitySummary>;
};

// ═════════════════════════════════════════════════════════════════════════════
// Frozen contracts (fz-ws1-backend/docs/API_CONTRACTS.md, 2026-06-06 freeze).
// Every type + method below mirrors that document — do not change shapes here
// without bumping the contract first.
// ═════════════════════════════════════════════════════════════════════════════

/** Serialize query params, skipping undefined/null/empty-string values. */
export function buildDashboardQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/** Standard paginated envelope (contract §0 Conventions). */
export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/**
 * Fetch a CSV endpoint (cookie-authenticated) and return the blob + the
 * server-suggested filename, ready for a download anchor.
 */
async function requestCsv(path: string, fallbackName: string): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(freezoneApiUrl(path), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "text/csv" },
  });
  if (!res.ok) {
    if (res.status === 401) notifyDashboardUnauthorized();
    let code = `HTTP_${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) code = j.error;
    } catch {
      /* non-JSON error body */
    }
    throw new DashboardApiError(res.status, code);
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return { blob: await res.blob(), filename: match?.[1] ?? fallbackName };
}

/** Trigger a browser download for a fetched CSV blob. */
export function saveBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Orders — contracts (a)–(d) ──────────────────────────────────────────────

export type OrdersSort = "createdAt_desc" | "createdAt_asc" | "total_desc" | "total_asc";

export type OrdersListQuery = {
  page?: number;
  pageSize?: number;
  /** Matches orderNumber / customerName / customerPhone (contains, case-insensitive). */
  search?: string;
  status?: OrderStatus;
  /** Exact paymentMethod match, e.g. "cod", "zaincash". */
  payment?: string;
  /** `YYYY-MM-DD` or full ISO; inclusive (see contract conventions). */
  from?: string;
  to?: string;
  sort?: OrdersSort;
};

/** Row shape of `GET /api/admin/orders` (contract a). */
export type OrderListRow = {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  fulfillment: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  city: string;
  itemCount: number;
  subtotal: number;
  shipping: number;
  discountTotal: number;
  total: number;
  couponCode: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Aggregates over the **filtered set** (not just the page) — contract (a). */
export type OrdersListTotals = {
  count: number;
  /** Sum of `total` excluding cancelled orders. */
  revenue: number;
  discount: number;
  shipping: number;
  /** Integer average order value; 0 when no orders. */
  aov: number;
};

export type OrdersListResponse = Paginated<OrderListRow> & { totals: OrdersListTotals };

/** One `OrderStatusEvent` row (timeline entry or internal note) — contract (b). */
export type OrderStatusEvent = {
  id: number;
  kind: "status" | "note";
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  note: string | null;
  userId: number | null;
  userEmail: string | null;
  createdAt: string;
};

export type OrderDetailItem = OrderLineItem & {
  /** `null` when the product was hard-deleted. */
  product: { id: number; slug: string | null; nameEn: string; nameAr: string } | null;
};

/** `GET /api/admin/orders/:id` — contract (b). */
export type OrderDetail = Omit<Order, "items"> & {
  items: OrderDetailItem[];
  /** `kind: "status"` events, ascending createdAt. */
  statusHistory: OrderStatusEvent[];
  /** `kind: "note"` events, ascending createdAt. Never public. */
  internalNotes: OrderStatusEvent[];
};

export type OrderCancelPayload = {
  reason?: string;
  /** Defaults to true server-side. */
  restoreStock?: boolean;
};

export type OrderCancelResponse = {
  id: number;
  status: "cancelled";
  stockRestored: Array<{ productId: number; qty: number }>;
};

export const ordersApi = {
  /** GET /api/admin/orders — paginated + filtered list (contract a). */
  list: (query: OrdersListQuery = {}) =>
    dashboardApi.get<OrdersListResponse>(`/api/admin/orders${buildDashboardQuery(query)}`),

  /** GET /api/admin/orders/:id — detail with timeline + internal notes (contract b). */
  detail: (id: number) => dashboardApi.get<OrderDetail>(`/api/admin/orders/${id}`),

  /**
   * PATCH /api/admin/orders/:id — status transition (contract b).
   * Transition to "cancelled" is rejected with 409 USE_CANCEL_ENDPOINT — use {@link ordersApi.cancel}.
   */
  updateStatus: (id: number, status: Exclude<OrderStatus, "cancelled">) =>
    dashboardApi.patch<{ id: number; status: OrderStatus }>(`/api/admin/orders/${id}`, { status }),

  /** POST /api/admin/orders/:id/notes — add internal staff note (contract b). */
  addNote: (id: number, text: string) =>
    dashboardApi.post<OrderStatusEvent>(`/api/admin/orders/${id}/notes`, { text }),

  /** POST /api/admin/orders/:id/cancel — cancel with explicit stock restore (contract c). */
  cancel: (id: number, payload: OrderCancelPayload = {}) =>
    dashboardApi.post<OrderCancelResponse>(`/api/admin/orders/${id}/cancel`, payload),

  /** URL of GET /api/admin/orders/export (contract d) — same filters as list, no pagination. */
  exportCsvUrl: (query: Omit<OrdersListQuery, "page" | "pageSize" | "sort"> = {}) =>
    freezoneApiUrl(`/api/admin/orders/export${buildDashboardQuery(query)}`),

  /** Fetch the orders CSV export as a blob (cookie-authenticated) — contract (d). */
  exportCsv: (query: Omit<OrdersListQuery, "page" | "pageSize" | "sort"> = {}) =>
    requestCsv(`/api/admin/orders/export${buildDashboardQuery(query)}`, "orders-export.csv"),
};

// ─── Notifications — contract (e) ────────────────────────────────────────────

/** Frozen vocabulary (extend-only). */
export type NotificationType =
  | "order.created"
  | "order.cancelled"
  | "stock.low"
  | "stock.out"
  | "review.pending"
  | "contact.message"
  | "system";

export type NotificationItem = {
  id: number;
  type: NotificationType | string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  /** Dashboard deep-link, e.g. `/dashboard/orders/1042`. */
  href: string | null;
  entity: string | null;
  entityId: string | null;
  payloadJson: unknown;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsQuery = {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  type?: string;
};

/**
 * Contract (e) extends the legacy counters additively. Until the WS1 backend
 * merges, the live endpoint returns only the counter fields — every list field
 * is optional here so consumers degrade gracefully.
 */
export type NotificationsResponse = Partial<Paginated<NotificationItem>> & {
  unreadCount?: number;
  pendingReview: number;
  newComments: number;
  categoriesNoAttrs: number;
  role?: Role;
};

export type NotificationsMarkReadPayload = { ids: number[] } | { all: true };

export const notificationsApi = {
  /** GET /api/admin/notifications (contract e). */
  list: (query: NotificationsQuery = {}) =>
    dashboardApi.get<NotificationsResponse>(`/api/admin/notifications${buildDashboardQuery(query)}`),

  /** POST /api/admin/notifications/mark-read (contract e). */
  markRead: (payload: NotificationsMarkReadPayload) =>
    dashboardApi.post<{ updated: number }>("/api/admin/notifications/mark-read", payload),
};

// ─── Analytics — contract (f) ────────────────────────────────────────────────

export type AnalyticsQuery = {
  /** `YYYY-MM-DD`; defaults to last 30 days ending today. */
  from?: string;
  to?: string;
  /** Adds the immediately-preceding period of equal length (default true). */
  compare?: boolean;
};

export type AnalyticsTotals = {
  revenue: number;
  orders: number;
  aov: number;
  units: number;
  discount: number;
  shipping: number;
  cancelledOrders: number;
};

export type AnalyticsResponse = {
  range: { from: string; to: string };
  previousRange: { from: string; to: string } | null;
  totals: AnalyticsTotals;
  previous: AnalyticsTotals | null;
  /** Each pct is null when the previous value is 0. */
  delta: {
    revenuePct: number | null;
    ordersPct: number | null;
    aovPct: number | null;
    unitsPct: number | null;
  } | null;
  /** Covers every day in the range (zero-filled). */
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  revenueByCategory: Array<{
    categoryId: number | null;
    slug: string | null;
    nameEn: string;
    nameAr: string;
    revenue: number;
    units: number;
    sharePct: number;
  }>;
  revenueByBrand: Array<{
    brandId: number | null;
    slug: string | null;
    nameEn: string;
    nameAr: string;
    revenue: number;
    units: number;
    sharePct: number;
  }>;
  salesByCity: Array<{ city: string; orders: number; revenue: number }>;
  couponPerformance: Array<{
    code: string;
    labelEn: string;
    labelAr: string;
    uses: number;
    discountTotal: number;
    revenue: number;
  }>;
  topProducts: Array<{
    productId: number;
    slug: string | null;
    nameEn: string;
    nameAr: string;
    units: number;
    revenue: number;
  }>;
};

export const analyticsApi = {
  /** GET /api/admin/dashboard/analytics — range analytics (contract f). */
  range: (query: AnalyticsQuery = {}) =>
    dashboardApi.get<AnalyticsResponse>(
      `/api/admin/dashboard/analytics${buildDashboardQuery(query)}`,
    ),
};

// ─── Audit log — contract (g) ────────────────────────────────────────────────

export type AuditLogQuery = {
  page?: number;
  /** Default 50, max 200. */
  pageSize?: number;
  /** e.g. "Product", "Order". */
  entity?: string;
  entityId?: string;
  /** userEmail contains (case-insensitive) or exact userId when numeric. */
  user?: string;
  /** Exact action, e.g. "product.bulk". */
  action?: string;
  from?: string;
  to?: string;
};

export type AuditLogEntry = {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  payload: unknown;
  userId: number | null;
  userEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AuditLogResponse = Paginated<AuditLogEntry> & {
  /** @deprecated mirror of `items` kept for legacy consumers. */
  rows: AuditLogEntry[];
  /** @deprecated cursor pagination is replaced by pages. */
  nextCursor: string | null;
};

export const auditApi = {
  /** GET /api/admin/audit-log — filtered + paginated (contract g). */
  list: (query: AuditLogQuery = {}) =>
    dashboardApi.get<AuditLogResponse>(`/api/admin/audit-log${buildDashboardQuery(query)}`),

  /** GET /api/admin/audit-log/:entity/:entityId — per-entity history, ascending (contract g). */
  entityHistory: (entity: string, entityId: string | number, query: { page?: number; pageSize?: number } = {}) =>
    dashboardApi.get<Paginated<AuditLogEntry>>(
      `/api/admin/audit-log/${encodeURIComponent(entity)}/${encodeURIComponent(String(entityId))}${buildDashboardQuery(query)}`,
    ),
};

// ─── Products bulk ops — contract (i) + existing actions ─────────────────────

export type ProductsBulkAction =
  | "publish"
  | "unpublish"
  | "soft_delete"
  | "restore"
  | "change_category"
  | "catalog_status"
  | "change_brand";

export type ProductsBulkPayload =
  | { action: "publish" | "unpublish" | "soft_delete" | "restore"; ids: number[] }
  | { action: "change_category"; ids: number[]; categoryId: number }
  | { action: "catalog_status"; ids: number[]; catalogStatus: ProductCatalogStatus }
  | { action: "change_brand"; ids: number[]; brandId: number | null };

/**
 * Note: this endpoint keeps its legacy bare shape (`{ ok, action, affected }`,
 * no `data` envelope) for compatibility — contract (i).
 */
export type ProductsBulkResponse = {
  ok: true;
  action: ProductsBulkAction;
  affected: number;
  /** Present for `catalog_status`: rows skipped, not failed. */
  skipped?: Array<{ id: number; reason: "invalid_transition" | "forbidden_transition" | string }>;
};

export const productsBulkApi = {
  /** POST /api/admin/products/bulk — one action over 1–200 product ids. */
  run: (payload: ProductsBulkPayload) =>
    dashboardApi.post<ProductsBulkResponse>("/api/admin/products/bulk", payload),
};

// ─── Products CSV import / export ────────────────────────────────────────────

export type ProductsCsvImportRowResult = {
  /** 1-based CSV line number (header = line 1, first data row = 2). */
  row: number;
  ok: boolean;
  productId?: number;
  error?: string;
};

export type ProductsCsvImportResult = {
  batchId: number;
  dryRun: boolean;
  succeeded: number;
  failed: number;
  results: ProductsCsvImportRowResult[];
};

/** Filters accepted by GET /api/admin/products/export (same as the products list). */
export type ProductsExportQuery = {
  search?: string;
  categoryId?: number;
  brandId?: number;
  status?: string;
  catalogStatus?: ProductCatalogStatus;
  sort?: string;
  /** Max rows (server caps at 2000, default 500). */
  limit?: number;
};

export const productsCsvApi = {
  /** POST /api/admin/import/products-csv — rows created as DRAFT; `dryRun` validates only. */
  import: (csv: string, opts: { dryRun?: boolean } = {}) =>
    dashboardApi.post<ProductsCsvImportResult>("/api/admin/import/products-csv", {
      csv,
      dryRun: opts.dryRun ?? false,
    }),

  /** URL of GET /api/admin/products/export (CSV, UTF-8 BOM). */
  exportUrl: (query: ProductsExportQuery = {}) =>
    freezoneApiUrl(`/api/admin/products/export${buildDashboardQuery(query)}`),

  /** Fetch the products CSV export as a blob (cookie-authenticated). */
  export: (query: ProductsExportQuery = {}) =>
    requestCsv(`/api/admin/products/export${buildDashboardQuery(query)}`, "products-export.csv"),
};

// ─── Product variants ────────────────────────────────────────────────────────

/** Full `ProductVariant` row (mirrors prisma model). */
export type ProductVariant = {
  id: number;
  productId: number;
  sku: string;
  labelEn: string;
  labelAr: string;
  priceOverride: number | null;
  oldPrice: number | null;
  optionName1: string | null;
  optionValue1: string | null;
  optionName2: string | null;
  optionValue2: string | null;
  optionName3: string | null;
  optionValue3: string | null;
  /** FreeZone-hosted `/uploads/*` path when set (external hosts rejected). */
  imageUrl: string | null;
  sourceVariantId: string | null;
  sourceRawJson: unknown;
  quantity: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductVariantInput = {
  /** Stable source id — upsert key per (productId, sourceVariantId). */
  sourceVariantId?: string | null;
  sku?: string;
  labelEn?: string;
  labelAr?: string;
  priceOverride?: number | null;
  oldPrice?: number | null;
  optionName1?: string | null;
  optionValue1?: string | null;
  optionName2?: string | null;
  optionValue2?: string | null;
  optionName3?: string | null;
  optionValue3?: string | null;
  imageUrl?: string | null;
  sourceRawJson?: unknown;
  quantity?: number;
  active?: boolean;
  sortOrder?: number;
};

export type ProductVariantUpsertResult = {
  id: number;
  sourceVariantId: string | null;
  action: "created" | "updated";
};

export const variantsApi = {
  /** GET /api/admin/products/:id/variants. */
  list: async (productId: number): Promise<ProductVariant[]> => {
    const res = await dashboardApi.get<{ variants: ProductVariant[] }>(
      `/api/admin/products/${productId}/variants`,
    );
    return res.variants ?? [];
  },

  /** POST /api/admin/products/:id/variants — idempotent upsert by sourceVariantId. */
  upsert: async (productId: number, variants: ProductVariantInput[]): Promise<ProductVariantUpsertResult[]> => {
    const res = await dashboardApi.post<{ variants: ProductVariantUpsertResult[] }>(
      `/api/admin/products/${productId}/variants`,
      { variants },
    );
    return res.variants ?? [];
  },
};

// ─── Category attributes + templates ─────────────────────────────────────────

export type CategoryAttributeType =
  | "SELECT"
  | "MULTI_SELECT"
  | "RANGE"
  | "BOOLEAN"
  | "TEXT"
  | "COLOR";

/** Bilingual attribute definition (FacetAttributeDef shape used across the API). */
export type CategoryAttributeDef = {
  key: string;
  name_en: string;
  name_ar: string;
  type?: CategoryAttributeType;
  options?: string[];
  filterable?: boolean;
  searchable?: boolean;
  comparable?: boolean;
  displayGroup?: string;
  required?: boolean;
  unit?: string;
  displaySpecKey?: string;
  displaySpecNameEn?: string;
  displaySpecNameAr?: string;
  displaySpecGroup?: string;
  displaySpecRequired?: boolean;
  linkDisplaySpec?: boolean;
};

export type CategoryAttributesResponse = {
  categoryId: number;
  slug: string;
  categoryAttributes: CategoryAttributeDef[];
};

export type CategoryTemplateSummary = {
  id: string;
  nameAr: string;
  nameEn: string;
  attributeCount: number;
};

export type ApplyTemplateResult = {
  templateId: string;
  attributeCount: number;
  categoryAttributes: number;
};

export const categoryAttributesApi = {
  /** GET /api/admin/categories/:id/attributes — full attribute schema. */
  get: (categoryId: number) =>
    dashboardApi.get<CategoryAttributesResponse>(`/api/admin/categories/${categoryId}/attributes`),

  /**
   * Replace the attribute schema. The write path is the category PATCH with
   * `facetKeys` (the server syncs `CategoryAttribute` rows from it).
   */
  set: (categoryId: number, categoryAttributes: CategoryAttributeDef[]) =>
    dashboardApi.patch<CategoryFull>(`/api/admin/categories/${categoryId}`, {
      facetKeys: categoryAttributes,
    }),

  /** POST /api/admin/categories/:id/attributes/option — append one option to a SELECT/MULTI_SELECT/COLOR attribute. */
  addOption: (categoryId: number, attributeKey: string, option: string) =>
    dashboardApi.post<{ ok: true; attributeKey: string; options: string[] }>(
      `/api/admin/categories/${categoryId}/attributes/option`,
      { attributeKey, option },
    ),

  /** GET /api/admin/category-templates — available attribute templates. */
  templates: () => dashboardApi.get<CategoryTemplateSummary[]>("/api/admin/category-templates"),

  /** POST /api/admin/categories/:id/apply-template — apply a template's attributes. */
  applyTemplate: (categoryId: number, templateId: string) =>
    dashboardApi.post<ApplyTemplateResult>(
      `/api/admin/categories/${categoryId}/apply-template`,
      { templateId },
    ),
};

// ─── Public order tracking — contract (h) ────────────────────────────────────

export type OrderTrackingItem = { name: string; qty: number; image: string | null };

export type OrderTrackingResponse = {
  orderNumber: string;
  status: OrderStatus;
  fulfillment: string;
  city: string;
  createdAt: string;
  subtotal: number;
  shipping: number;
  discountTotal: number;
  total: number;
  items: OrderTrackingItem[];
  /** Order creation (`pending`) + status events, ascending. */
  timeline: Array<{ status: OrderStatus; at: string }>;
};

export const orderTrackingApi = {
  /**
   * POST /api/public/orders/track (contract h). Unauthenticated; rate-limited
   * 10/min/IP. Wrong number or wrong phone both return 404 (no oracle).
   */
  track: (orderNumber: string, phone: string) =>
    dashboardApi.post<OrderTrackingResponse>("/api/public/orders/track", { orderNumber, phone }),
};

// ─── Admin global search (topbar / command palette) ──────────────────────────

export type AdminSearchProductHit = {
  id: number;
  nameAr: string;
  nameEn: string;
  sku: string;
  slug: string | null;
  catalogStatus: ProductCatalogStatus | string;
};

export type AdminSearchTaxonomyHit = { id: number; nameAr: string; nameEn: string; slug: string };

export type AdminSearchUserHit = { id: number; name: string; email: string; role: Role | string };

export type AdminSearchResponse = {
  products: AdminSearchProductHit[];
  categories: AdminSearchTaxonomyHit[];
  brands: AdminSearchTaxonomyHit[];
  users: AdminSearchUserHit[];
};

export const adminSearchApi = {
  /** GET /api/admin/search — cross-entity typeahead (products/categories/brands/users). */
  query: (q: string, limit = 8) =>
    dashboardApi.get<AdminSearchResponse>(
      `/api/admin/search${buildDashboardQuery({ q, limit })}`,
    ),
};
