/**
 * RBAC scaffold (Phase 1) — wire to Auth.js / dashboard users later.
 */
export const ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "products:read",
  "products:write",
  "orders:read",
  "orders:write",
  "cms:read",
  "cms:write",
  "users:manage",
  "settings:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  ADMIN: [
    "products:read",
    "products:write",
    "orders:read",
    "orders:write",
    "cms:read",
    "cms:write",
    "settings:manage",
  ],
  EDITOR: ["products:read", "products:write", "cms:read", "cms:write"],
  CUSTOMER: [],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
