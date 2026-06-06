import type { ProductCatalogStatus } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate } from "@/lib/admin-route-guard";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

const ACTIONS = [
  "publish",
  "unpublish",
  "soft_delete",
  "restore",
  "change_category",
  "change_brand",
  "catalog_status",
  "price_percent",
  "price_fixed_delta",
  "price_set",
] as const;
type BulkAction = (typeof ACTIONS)[number];

const CATALOG_STATUSES: ProductCatalogStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "PUBLISHED",
  "ARCHIVED",
];

/** Allowed catalog-status transitions per contract (i) in docs/API_CONTRACTS.md. */
const ALLOWED_TRANSITIONS: Record<ProductCatalogStatus, ProductCatalogStatus[]> = {
  DRAFT: ["PENDING_REVIEW", "ARCHIVED"],
  PENDING_REVIEW: ["PUBLISHED", "CHANGES_REQUESTED", "ARCHIVED"],
  CHANGES_REQUESTED: ["PENDING_REVIEW", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED", "CHANGES_REQUESTED"],
  ARCHIVED: ["DRAFT"],
};

type SkippedRow = { id: number; reason: "invalid_transition" | "forbidden_transition" | "not_found" };

/**
 * Apply a single action to many products at once.
 *
 *   POST /api/admin/products/bulk
 *   {
 *     action: "publish" | "unpublish" | "soft_delete" | "restore"
 *           | "change_category" | "change_brand" | "catalog_status"
 *           | "price_percent" | "price_fixed_delta" | "price_set",
 *     ids: number[],                 // 1..200 product ids
 *     categoryId?: number,           // change_category
 *     brandId?: number | null,       // change_brand (null clears the link)
 *     catalogStatus?: string,        // catalog_status target
 *     percent?: number, delta?: number, price?: number, // price ops
 *   }
 *
 * `soft_delete` flips `deletedAt = now()`; `restore` resets it to NULL. The
 * existing `DELETE /api/admin/products/:id` route still performs a hard
 * delete for one-offs. Response keeps the legacy `{ ok, action, affected }`
 * shape (no `data` envelope); `catalog_status` adds `skipped`.
 */
export async function POST(req: Request) {
  const mutateGuard = await guardAdminMutate(req);
  if (!mutateGuard.ok) return mutateGuard.response;
  const audit = auditContext(mutateGuard.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        action?: string;
        ids?: number[];
        categoryId?: number;
        brandId?: number | null;
        catalogStatus?: string;
        percent?: number;
        delta?: number;
        price?: number;
      }
    | null;

  const action = body?.action as BulkAction | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return Response.json(
      { error: "action must be one of: " + ACTIONS.join(", ") },
      { status: 400 },
    );
  }

  const rawIds = Array.isArray(body?.ids) ? body!.ids : [];
  const ids = Array.from(
    new Set(
      rawIds.filter((n): n is number => typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n > 0),
    ),
  );
  if (ids.length === 0) return Response.json({ error: "ids must be a non-empty array of positive integers" }, { status: 400 });
  if (ids.length > 200) return Response.json({ error: "max 200 ids per request" }, { status: 400 });

  if (action === "change_category") {
    if (typeof body?.categoryId !== "number" || !Number.isInteger(body.categoryId) || body.categoryId <= 0) {
      return Response.json({ error: "categoryId required for change_category" }, { status: 400 });
    }
    const target = await prisma.category.findUnique({ where: { id: body.categoryId }, select: { id: true } });
    if (!target) return Response.json({ error: "target category not found" }, { status: 404 });
  }

  /** change_brand: `brandId` must reference an existing Brand, or be `null` to clear. */
  let targetBrand: { id: number; nameEn: string } | null = null;
  if (action === "change_brand") {
    if (body?.brandId === undefined) {
      return Response.json({ error: "brandId required for change_brand (number or null)" }, { status: 400 });
    }
    if (body.brandId !== null) {
      if (typeof body.brandId !== "number" || !Number.isInteger(body.brandId) || body.brandId <= 0) {
        return Response.json({ error: "brandId must be a positive integer or null" }, { status: 400 });
      }
      targetBrand = await prisma.brand.findUnique({
        where: { id: body.brandId },
        select: { id: true, nameEn: true },
      });
      if (!targetBrand) return Response.json({ error: "target brand not found" }, { status: 404 });
    }
  }

  let targetStatus: ProductCatalogStatus | null = null;
  if (action === "catalog_status") {
    const raw = body?.catalogStatus;
    if (typeof raw !== "string" || !(CATALOG_STATUSES as string[]).includes(raw)) {
      return Response.json(
        { error: "catalogStatus must be one of: " + CATALOG_STATUSES.join(", ") },
        { status: 400 },
      );
    }
    targetStatus = raw as ProductCatalogStatus;
  }

  /** Only managers may target PUBLISHED in bulk (editors get skipped rows). */
  const actorRole =
    mutateGuard.actor.kind === "dashboard" ? mutateGuard.actor.user.role : mutateGuard.actor.role;
  const canPublish = actorRole === "CATALOG_MANAGER" || actorRole === "SUPER_ADMIN";

  try {
    let affected = 0;
    let skipped: SkippedRow[] | undefined;
    switch (action) {
      case "publish":
        affected = (
          await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { published: true, catalogStatus: "PUBLISHED" },
          })
        ).count;
        break;
      case "unpublish":
        affected = (
          await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { published: false, catalogStatus: "DRAFT" },
          })
        ).count;
        break;
      case "soft_delete":
        affected = (
          await prisma.product.updateMany({
            where: { id: { in: ids }, deletedAt: null },
            data: { deletedAt: new Date(), published: false, catalogStatus: "ARCHIVED" },
          })
        ).count;
        break;
      case "restore":
        affected = (
          await prisma.product.updateMany({
            where: { id: { in: ids }, deletedAt: { not: null } },
            data: { deletedAt: null },
          })
        ).count;
        break;
      case "change_category":
        affected = (
          await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { categoryId: body!.categoryId! },
          })
        ).count;
        break;
      case "change_brand":
        /** Also sync the legacy display string `Product.brand` (empty when clearing). */
        affected = (
          await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: {
              brandId: targetBrand ? targetBrand.id : null,
              brand: targetBrand ? targetBrand.nameEn : "",
            },
          })
        ).count;
        break;
      case "catalog_status": {
        const target = targetStatus!;
        const result = await prisma.$transaction(async (tx) => {
          const rows = await tx.product.findMany({
            where: { id: { in: ids } },
            select: { id: true, catalogStatus: true },
          });
          const foundIds = new Set(rows.map((r) => r.id));
          const skippedRows: SkippedRow[] = ids
            .filter((id) => !foundIds.has(id))
            .map((id) => ({ id, reason: "not_found" as const }));
          const allowedIds: number[] = [];
          for (const row of rows) {
            if (target === "PUBLISHED" && !canPublish) {
              skippedRows.push({ id: row.id, reason: "forbidden_transition" });
              continue;
            }
            if (!ALLOWED_TRANSITIONS[row.catalogStatus].includes(target)) {
              skippedRows.push({ id: row.id, reason: "invalid_transition" });
              continue;
            }
            allowedIds.push(row.id);
          }
          let count = 0;
          if (allowedIds.length > 0) {
            count = (
              await tx.product.updateMany({
                where: { id: { in: allowedIds } },
                data: {
                  catalogStatus: target,
                  ...(target === "PUBLISHED" ? { published: true } : {}),
                  ...(target === "ARCHIVED" ? { published: false } : {}),
                },
              })
            ).count;
          }
          return { count, skippedRows };
        });
        affected = result.count;
        skipped = result.skippedRows;
        break;
      }
      case "price_percent": {
        const pct = typeof body?.percent === "number" ? body.percent : 0;
        /** Single transaction — a mid-batch failure must not leave half the prices changed. */
        affected = await prisma.$transaction(async (tx) => {
          const rows = await tx.product.findMany({ where: { id: { in: ids } }, select: { id: true, price: true } });
          let count = 0;
          for (const row of rows) {
            const next = Math.max(0, Math.round(row.price * (1 + pct / 100)));
            await tx.product.update({ where: { id: row.id }, data: { price: next } });
            count++;
          }
          return count;
        });
        break;
      }
      case "price_fixed_delta": {
        const delta = typeof body?.delta === "number" ? body.delta : 0;
        affected = await prisma.$transaction(async (tx) => {
          const rows = await tx.product.findMany({ where: { id: { in: ids } }, select: { id: true, price: true } });
          let count = 0;
          for (const row of rows) {
            const next = Math.max(0, row.price + delta);
            await tx.product.update({ where: { id: row.id }, data: { price: next } });
            count++;
          }
          return count;
        });
        break;
      }
      case "price_set": {
        const price = typeof body?.price === "number" ? Math.max(0, Math.round(body.price)) : 0;
        affected = (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { price } })).count;
        break;
      }
    }
    revalidateStorefrontData();
    await logAdminAction("product.bulk", "Product", {
      payload: {
        action,
        count: ids.length,
        affected,
        ids: ids.slice(0, 20),
        ...(targetStatus ? { catalogStatus: targetStatus } : {}),
        ...(action === "change_brand" ? { brandId: targetBrand?.id ?? null } : {}),
        ...(skipped && skipped.length ? { skipped: skipped.slice(0, 20) } : {}),
      },
      ...audit,
    });
    return Response.json({ ok: true, action, affected, ...(skipped ? { skipped } : {}) });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
