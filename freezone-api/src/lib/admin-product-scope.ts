import type { Prisma } from "@prisma/client";

/** Rows visible in admin list default and editable catalog (not soft-deleted). */
export const ACTIVE_PRODUCT_WHERE = { deletedAt: null } satisfies Prisma.ProductWhereInput;

/** Rows shown on the public storefront (matches catalog.ts). */
export const PUBLISHED_LIVE_WHERE = {
  deletedAt: null,
  published: true,
} satisfies Prisma.ProductWhereInput;

export const DRAFT_ACTIVE_WHERE = {
  deletedAt: null,
  published: false,
} satisfies Prisma.ProductWhereInput;

export const DELETED_PRODUCT_WHERE = {
  deletedAt: { not: null },
} satisfies Prisma.ProductWhereInput;

/** Unpublished active rows that still carry import provenance (cleanup candidates). */
export const STALE_IMPORT_DRAFT_WHERE = {
  deletedAt: null,
  published: false,
  OR: [
    { sourceHandle: { not: null } },
    { importedAt: { not: null } },
    { importBatchId: { not: null } },
  ],
} satisfies Prisma.ProductWhereInput;

export function mergeProductWhere(
  base: Prisma.ProductWhereInput,
  extra?: Prisma.ProductWhereInput,
): Prisma.ProductWhereInput {
  return extra ? { AND: [base, extra] } : base;
}
