import { create } from "zustand";
import { freezoneApiUrl, getInternalApiFetchSignal } from "@/lib/api-internal";
import { dashboardApi, type DashboardUser, type LegacyRoleAlias, type Role } from "./api";

export type AuthMode = "dashboard" | "legacy";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  status: AuthStatus;
  user: DashboardUser | null;
  mode: AuthMode | null;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (min: Role | LegacyRoleAlias) => boolean;
};

const ROLE_RANK: Record<Role, number> = {
  CATALOG_EDITOR: 0,
  CATALOG_MANAGER: 1,
  SUPER_ADMIN: 2,
};

const LEGACY_ROLE_ALIAS: Record<LegacyRoleAlias, Role> = {
  viewer: "CATALOG_EDITOR",
  editor: "CATALOG_EDITOR",
  admin: "CATALOG_MANAGER",
  superadmin: "SUPER_ADMIN",
};

function normalizeRole(min: Role | LegacyRoleAlias): Role {
  return LEGACY_ROLE_ALIAS[min as LegacyRoleAlias] ?? (min as Role);
}

const LEGACY_USER: DashboardUser = {
  id: 0,
  email: "legacy@admin",
  name: "مسؤول — دخول كلمة المرور",
  role: "SUPER_ADMIN",
  avatarUrl: null,
};

export const useDashboardAuth = create<AuthState>((set, get) => ({
  status: "idle",
  user: null,
  mode: null,

  async refresh() {
    set({ status: "loading" });
    try {
      const user = await dashboardApi.get<DashboardUser>("/api/dashboard/auth/me");
      set({ status: "authenticated", user, mode: "dashboard" });
      return;
    } catch {
      /* try legacy admin cookie */
    }
    try {
      const r = await fetch(freezoneApiUrl("/api/admin/dashboard-stats"), {
        credentials: "include",
        cache: "no-store",
        signal: getInternalApiFetchSignal(),
      });
      if (r.ok) {
        set({ status: "authenticated", user: LEGACY_USER, mode: "legacy" });
        return;
      }
    } catch {
      /* ignore */
    }
    set({ status: "unauthenticated", user: null, mode: null });
  },

  async login(email, password) {
    const res = await dashboardApi.post<{ user: DashboardUser }>("/api/dashboard/auth/login", {
      email,
      password,
    });
    const user = (res as unknown as { user?: DashboardUser }).user ?? (res as unknown as DashboardUser);
    set({ status: "authenticated", user, mode: "dashboard" });
  },

  async logout() {
    try {
      await dashboardApi.post("/api/dashboard/auth/logout");
    } catch {
      /* ignore */
    }
    try {
      await fetch(freezoneApiUrl("/api/admin/logout"), { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    set({ status: "unauthenticated", user: null, mode: null });
  },

  hasRole(min) {
    const u = get().user;
    if (!u) return false;
    if (get().mode === "legacy") return true;
    const floor = normalizeRole(min);
    return ROLE_RANK[u.role] >= ROLE_RANK[floor];
  },
}));
