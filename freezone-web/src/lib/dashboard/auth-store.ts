import { create } from "zustand";
import { freezoneApiUrl } from "@/lib/api-internal";
import { dashboardApi, type DashboardUser, type LegacyRoleAlias, type Role } from "./api";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  status: AuthStatus;
  user: DashboardUser | null;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  /** Passwordless entry — succeeds only when the API has ADMIN_DIRECT_LOGIN on. */
  directEntry: () => Promise<void>;
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

export const useDashboardAuth = create<AuthState>((set, get) => ({
  status: "idle",
  user: null,

  async refresh() {
    set({ status: "loading" });
    try {
      const user = await dashboardApi.get<DashboardUser>("/api/dashboard/auth/me");
      set({ status: "authenticated", user });
    } catch {
      set({ status: "unauthenticated", user: null });
    }
  },

  async login(email, password) {
    const user = await dashboardApi.post<DashboardUser>("/api/dashboard/auth/login", {
      email,
      password,
    });
    set({ status: "authenticated", user });
  },

  async directEntry() {
    const user = await dashboardApi.post<DashboardUser>("/api/dashboard/auth/direct-login");
    set({ status: "authenticated", user });
  },

  async logout() {
    try {
      await dashboardApi.post("/api/dashboard/auth/logout");
    } catch {
      /* ignore */
    }
    // Clear any straggling legacy /admin cookie left from earlier deployments.
    try {
      await fetch(freezoneApiUrl("/api/admin/logout"), { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    set({ status: "unauthenticated", user: null });
  },

  hasRole(min) {
    const u = get().user;
    if (!u) return false;
    const floor = normalizeRole(min);
    return ROLE_RANK[u.role] >= ROLE_RANK[floor];
  },
}));
