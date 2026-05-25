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
  "price_percent",
  "price_fixed_delta",
  "price_set",
] as const;
type BulkAction = (typeof ACTIONS)[number];

/**
 * Apply a single action to many products at once.
 *
 *   POST /api/admin/products/bulk
 *   {
 *     action: "publish" | "unpublish" | "soft_delete" | "restore" | "change_category",
 *     ids: number[],            // 1..200 product ids
 *     categoryId?: number,      // only for "change_category"
 *   }
 *
 * `soft_delete` flips `deletedAt = now()`; `restore` resets it to NULL. The
 * existing `DELETE /api/admin/products/:id` route still performs a hard
 * delete for one-offs.
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

  try {
    let affected = 0;
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
      case "price_percent": {
        const pct = typeof body?.percent === "number" ? body.percent : 0;
        const rows = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, price: true } });
        for (const row of rows) {
          const next = Math.max(0, Math.round(row.price * (1 + pct / 100)));
          await prisma.product.update({ where: { id: row.id }, data: { price: next } });
          affected++;
        }
        break;
      }
      case "price_fixed_delta": {
        const delta = typeof body?.delta === "number" ? body.delta : 0;
        const rows = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, price: true } });
        for (const row of rows) {
          const next = Math.max(0, row.price + delta);
          await prisma.product.update({ where: { id: row.id }, data: { price: next } });
          affected++;
        }
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
      payload: { action, count: ids.length, affected, ids: ids.slice(0, 20) },
      ...audit,
    });
    return Response.json({ ok: true, action, affected });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
