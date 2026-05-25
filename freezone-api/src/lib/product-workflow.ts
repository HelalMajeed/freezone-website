import type { AdminRole, ProductCatalogStatus } from "@prisma/client";

const TRANSITIONS: Record<
  ProductCatalogStatus,
  Partial<Record<ProductCatalogStatus, AdminRole[]>>
> = {
  DRAFT: {
    PENDING_REVIEW: ["CATALOG_EDITOR", "CATALOG_MANAGER", "SUPER_ADMIN"],
    PUBLISHED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    ARCHIVED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
  },
  PENDING_REVIEW: {
    DRAFT: ["CATALOG_EDITOR", "CATALOG_MANAGER", "SUPER_ADMIN"],
    PUBLISHED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    CHANGES_REQUESTED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    ARCHIVED: ["SUPER_ADMIN"],
  },
  CHANGES_REQUESTED: {
    DRAFT: ["CATALOG_EDITOR", "CATALOG_MANAGER", "SUPER_ADMIN"],
    PENDING_REVIEW: ["CATALOG_EDITOR", "CATALOG_MANAGER", "SUPER_ADMIN"],
    ARCHIVED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
  },
  PUBLISHED: {
    ARCHIVED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    DRAFT: ["SUPER_ADMIN"],
    PENDING_REVIEW: ["SUPER_ADMIN"],
    CHANGES_REQUESTED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
  },
  ARCHIVED: {
    DRAFT: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    PUBLISHED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    PENDING_REVIEW: ["SUPER_ADMIN"],
  },
};

export function canTransitionCatalogStatus(
  from: ProductCatalogStatus,
  to: ProductCatalogStatus,
  role: AdminRole,
): boolean {
  if (from === to) return true;
  if (role === "SUPER_ADMIN") return true;
  const allowed = TRANSITIONS[from]?.[to];
  return allowed?.includes(role) ?? false;
}

/** Maps workflow status to storefront `published` flag. */
export function publishedFromCatalogStatus(status: ProductCatalogStatus): boolean {
  return status === "PUBLISHED";
}
