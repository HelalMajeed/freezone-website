import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate, guardAdminRead } from "@/lib/admin-route-guard";
import { actorForAudit } from "@/lib/admin-auth";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { persistProductSpecsForProduct, validateProductSpecsAgainstCategory } from "@/lib/admin-product-specs";
import { replaceProductSecondaryCategories } from "@/lib/sync-product-secondary-categories";
import { productQueryMissingSecondarySupport } from "@/lib/prisma-product-secondary-fallback";
import {
  adminProductsOrderBy,
  adminProductsWhere,
  parseAdminProductsListQuery,
} from "@/lib/admin-products-list";

export async function GET(req: Request) {
  const readGuard = await guardAdminRead(req);
  if (!readGuard.ok) return readGuard.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const url = new URL(req.url);
  const listQuery = parseAdminProductsListQuery(url);
  const paginated = url.searchParams.has("page") || url.searchParams.has("pageSize");

  const adminListIncludeBase = {
    category: { select: { slug: true, nameEn: true, nameAr: true } },
    brandRef: { select: { slug: true, nameEn: true, nameAr: true } },
    images: { orderBy: { sortOrder: "asc" } as const },
  };

  try {
    const where = adminProductsWhere(listQuery);
    const orderBy = adminProductsOrderBy(listQuery.sort);
    const skip = (listQuery.page - 1) * listQuery.pageSize;
    const take = paginated ? listQuery.pageSize : 200;

    let rows;
    let total = 0;
    try {
      if (paginated) {
        [total, rows] = await Promise.all([
          prisma.product.count({ where }),
          prisma.product.findMany({
            where,
            include: {
              ...adminListIncludeBase,
              secondaryCategories: { select: { categoryId: true } },
            },
            orderBy,
            skip,
            take,
          }),
        ]);
      } else {
        rows = await prisma.product.findMany({
          where,
          include: {
            ...adminListIncludeBase,
            secondaryCategories: { select: { categoryId: true } },
          },
          orderBy: { id: "desc" },
          take,
        });
        total = rows.length;
      }
    } catch (e) {
      if (!productQueryMissingSecondarySupport(e)) throw e;
      if (paginated) {
        [total, rows] = await Promise.all([
          prisma.product.count({ where }),
          prisma.product.findMany({
            where,
            include: { ...adminListIncludeBase },
            orderBy,
            skip,
            take,
          }),
        ]);
      } else {
        rows = await prisma.product.findMany({
          where,
          include: { ...adminListIncludeBase },
          orderBy: { id: "desc" },
          take,
        });
        total = rows.length;
      }
    }

    if (paginated) {
      return Response.json({
        items: rows,
        total,
        page: listQuery.page,
        pageSize: listQuery.pageSize,
        totalPages: Math.max(1, Math.ceil(total / listQuery.pageSize)),
      });
    }
    return Response.json(rows);
  } catch (e) {
    return handleRouteDbError(e);
  }
}

/**
 * Zod-formalized create payload (ship run, ASSUMPTIONS A-16) — the editor's
 * minimal create flow and the Global Iraq importer (run-batch loop-back) both
 * post here. Field types deliberately mirror what the previous inline TS cast
 * + manual checks accepted, so valid callers are byte-identical; only
 * wrong-typed payloads now get the standard VALIDATION error. The
 * categoryId/nameEn/price "required" check, the specs-vs-category validation
 * (whose exact error text the importer's retry loop parses), the external-URL
 * image rejection and all defaulting stay in the handler, unchanged.
 */
const adminProductCreateSchema = z.object({
  categoryId: z.number().optional(),
  brand: z.string().optional(),
  brandId: z.number().nullable().optional(),
  sku: z.string().optional(),
  model: z.string().optional(),
  quantity: z.number().optional(),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  descEn: z.string().optional(),
  descAr: z.string().optional(),
  price: z.number().optional(),
  oldPrice: z.number().nullable().optional(),
  storage: z.string().optional(),
  model3d: z.string().nullable().optional(),
  /** Warranty label shown on PDP + admin. Optional. */
  warranty: z.string().nullable().optional(),
  /** Nullable elements: the handler has always dropped falsy entries via filter(Boolean). */
  images: z.array(z.string().nullable()).optional(),
  /** Real validation happens against the category schema in the handler. */
  specs: z.record(z.string(), z.unknown()).optional(),
  secondaryCategoryIds: z.array(z.number()).optional(),
  /** Caller can opt the row out of publishing (useful for imports — review first). */
  published: z.boolean().optional(),
  isNew: z.boolean().optional(),
  featured: z.boolean().optional(),
  /** Import provenance — set by the Global Iraq scraper, ignored otherwise. */
  sourceUrl: z.string().nullable().optional(),
  sourceHandle: z.string().nullable().optional(),
  sourcePrice: z.number().nullable().optional(),
  importedAt: z.string().nullable().optional(),
  importBatchId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const mutateGuard = await guardAdminMutate(req);
  if (!mutateGuard.ok) return mutateGuard.response;
  const audit = auditContext(mutateGuard.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const raw = await req.json().catch(() => null);
  /** `?? {}` routes an empty/missing body to the historical "required" answer below. */
  const parsed = adminProductCreateSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return Response.json(
      { ok: false, error: first?.message ?? "بيانات غير صالحة", code: "VALIDATION" },
      { status: 400 },
    );
  }
  const body = parsed.data;

  if (!body.categoryId || !body.nameEn || typeof body.price !== "number") {
    return Response.json({ error: "categoryId, nameEn, price required" }, { status: 400 });
  }

  const specCheck = await validateProductSpecsAgainstCategory(body.categoryId, body.specs);
  if (!specCheck.ok) {
    return Response.json({ error: specCheck.error }, { status: 400 });
  }

  const images = (body.images ?? []).filter((u): u is string => Boolean(u));
  for (const url of images) {
    if (typeof url === "string" && /^https?:\/\//i.test(url.trim())) {
      return Response.json(
        {
          error: "لا يمكن حفظ رابط خارجي مباشرة. استخدم «تنزيل وحفظ الصورة» لاستيراد الصورة محلياً.",
        },
        { status: 400 },
      );
    }
  }

  try {
    const product = await prisma.product.create({
      data: {
        categoryId: body.categoryId,
        brand: body.brand || "—",
        brandId: body.brandId != null && Number.isFinite(body.brandId) ? body.brandId : null,
        sku: (body.sku ?? "").trim() || "—",
        model: typeof body.model === "string" ? body.model.trim() : "",
        quantity: typeof body.quantity === "number" && Number.isFinite(body.quantity) ? body.quantity : 0,
        nameEn: body.nameEn,
        nameAr: body.nameAr || body.nameEn,
        descEn: body.descEn ?? "",
        descAr: body.descAr ?? "",
        price: body.price,
        oldPrice: body.oldPrice ?? null,
        storage: body.storage ?? "",
        model3d: body.model3d?.trim() || null,
        warranty: body.warranty?.trim() ?? "",
        specs: specCheck.specs as object,
        /** Default to published=true (existing behaviour) — importer passes published=false explicitly. */
        published: body.published !== undefined ? !!body.published : true,
        ...(body.isNew !== undefined ? { isNew: !!body.isNew } : {}),
        ...(body.featured !== undefined ? { featured: !!body.featured } : {}),
        ...(body.sourceUrl ? { sourceUrl: body.sourceUrl } : {}),
        ...(body.sourceHandle ? { sourceHandle: body.sourceHandle } : {}),
        ...(typeof body.sourcePrice === "number" && Number.isFinite(body.sourcePrice)
          ? { sourcePrice: Math.round(body.sourcePrice) }
          : {}),
        ...(body.importedAt ? { importedAt: new Date(body.importedAt) } : {}),
        ...(body.importBatchId ? { importBatchId: body.importBatchId } : {}),
      },
    });

    /** Inventory ledger: opening stock entry. Importer-created rows record
     *  reason "import" (provenance via importBatchId), manual creates "manual_adjust". */
    if (product.quantity > 0) {
      const actor = actorForAudit(mutateGuard.actor);
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          delta: product.quantity,
          reason: body.importBatchId ? "import" : "manual_adjust",
          qtyBefore: 0,
          qtyAfter: product.quantity,
          userId: actor.userId,
          userEmail: actor.userEmail,
          note: body.importBatchId ? `importBatch:${body.importBatchId}` : "initial stock on create",
        },
      });
    }

    const persisted = await persistProductSpecsForProduct(product.id, body.categoryId, body.specs);
    if (persisted.ok && Object.keys(persisted.specs).length) {
      await prisma.product.update({
        where: { id: product.id },
        data: { specs: persisted.specs as object },
      });
    }

    if (Array.isArray(body.secondaryCategoryIds)) {
      await replaceProductSecondaryCategories(product.id, product.categoryId, body.secondaryCategoryIds);
    }

    let order = 0;
    for (const url of images) {
      await prisma.productImage.create({
        data: { productId: product.id, url, sortOrder: order++ },
      });
    }

    revalidateStorefrontData();
    await logAdminAction("product.create", "Product", {
      entityId: product.id,
      payload: { nameEn: product.nameEn },
      ...audit,
    });
    return Response.json({ id: product.id });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
