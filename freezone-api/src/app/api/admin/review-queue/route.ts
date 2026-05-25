import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead, guardAdminMutate, auditContext } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { canTransitionCatalogStatus, publishedFromCatalogStatus } from "@/lib/product-workflow";
import type { AdminRole, ProductCatalogStatus } from "@prisma/client";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { ACTIVE_PRODUCT_WHERE } from "@/lib/admin-product-scope";

export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "لا توجد قاعدة بيانات", code: "NO_DATABASE" }, { status: 503 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(10, parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25));
  const skip = (page - 1) * pageSize;

  try {
    const where = { ...ACTIVE_PRODUCT_WHERE, catalogStatus: "PENDING_REVIEW" as const };
    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: [{ submittedAt: "asc" }, { updatedAt: "asc" }],
        skip,
        take: pageSize,
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          sku: true,
          price: true,
          quantity: true,
          catalogStatus: true,
          submittedAt: true,
          updatedAt: true,
          createdById: true,
          category: { select: { nameAr: true, nameEn: true } },
          brandRef: { select: { nameAr: true, nameEn: true } },
          images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
        },
      }),
    ]);
    return Response.json({
      ok: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

/** PATCH body: { productId, action: "publish" | "changes_requested", reviewNotes?: string } */
export async function PATCH(req: Request): Promise<Response> {
  const mutate = await guardAdminMutate(req, ["CATALOG_MANAGER", "SUPER_ADMIN"]);
  if (!mutate.ok) return mutate.response;
  const audit = auditContext(mutate.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "لا توجد قاعدة بيانات" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    productId?: number;
    action?: string;
    reviewNotes?: string;
  } | null;
  const productId = body?.productId;
  if (!productId || !Number.isFinite(productId)) {
    return Response.json({ ok: false, error: "معرّف المنتج مطلوب", code: "INVALID_ID" }, { status: 400 });
  }

  const role: AdminRole =
    mutate.actor.kind === "dashboard" ? mutate.actor.user.role : "SUPER_ADMIN";

  let next: ProductCatalogStatus;
  if (body?.action === "publish") next = "PUBLISHED";
  else if (body?.action === "changes_requested") next = "CHANGES_REQUESTED";
  else {
    return Response.json({ ok: false, error: "إجراء غير معروف", code: "INVALID_ACTION" }, { status: 400 });
  }

  try {
    const product = await prisma.product.findFirst({
      where: { id: productId, ...ACTIVE_PRODUCT_WHERE },
    });
    if (!product) {
      return Response.json({ ok: false, error: "المنتج غير موجود", code: "NOT_FOUND" }, { status: 404 });
    }
    if (!canTransitionCatalogStatus(product.catalogStatus, next, role)) {
      return Response.json(
        { ok: false, error: "لا يمكن تنفيذ هذا الإجراء", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        catalogStatus: next,
        published: publishedFromCatalogStatus(next),
        reviewNotes: body?.reviewNotes?.trim() || product.reviewNotes,
      },
    });

    if (body?.reviewNotes?.trim() && mutate.actor.kind === "dashboard") {
      await prisma.productComment.create({
        data: {
          productId,
          userId: mutate.actor.user.id,
          text: body.reviewNotes.trim(),
        },
      });
    }

    revalidateStorefrontData();
    await logAdminAction("product.review", "Product", {
      entityId: productId,
      payload: { action: body?.action, catalogStatus: next },
      ...audit,
    });
    return Response.json({ ok: true, data: { catalogStatus: next } });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
