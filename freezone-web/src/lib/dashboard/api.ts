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
