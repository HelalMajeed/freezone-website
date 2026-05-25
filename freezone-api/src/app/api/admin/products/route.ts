import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate, guardAdminRead } from "@/lib/admin-route-guard";
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

export async function POST(req: Request) {
  const mutateGuard = await guardAdminMutate(req);
  if (!mutateGuard.ok) return mutateGuard.response;
  const audit = auditContext(mutateGuard.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    categoryId?: number;
    brand?: string;
    brandId?: number | null;
    sku?: string;
    model?: string;
    quantity?: number;
    nameEn?: string;
    nameAr?: string;
    descEn?: string;
    descAr?: string;
    price?: number;
    oldPrice?: number | null;
    storage?: string;
    model3d?: string | null;
    /** Warranty label shown on PDP + admin. Optional. */
    warranty?: string | null;
    images?: string[];
    specs?: Record<string, unknown>;
    secondaryCategoryIds?: number[];
    /** Caller can opt the row out of publishing (useful for imports — review first). */
    published?: boolean;
    isNew?: boolean;
    featured?: boolean;
    /** Import provenance — set by the Global Iraq scraper, ignored otherwise. */
    sourceUrl?: string | null;
    sourceHandle?: string | null;
    sourcePrice?: number | null;
    importedAt?: string | null;
    importBatchId?: string | null;
  } | null;

  if (!body?.categoryId || !body.nameEn || typeof body.price !== "number") {
    return Response.json({ error: "categoryId, nameEn, price required" }, { status: 400 });
  }

  const specCheck = await validateProductSpecsAgainstCategory(body.categoryId, body.specs);
  if (!specCheck.ok) {
    return Response.json({ error: specCheck.error }, { status: 400 });
  }

  const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
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
