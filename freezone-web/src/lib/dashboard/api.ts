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
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

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
