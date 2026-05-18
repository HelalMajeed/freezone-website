import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { persistProductSpecsForProduct, validateProductSpecsAgainstCategory } from "@/lib/admin-product-specs";
import { replaceProductSecondaryCategories } from "@/lib/sync-product-secondary-categories";
import { productQueryMissingSecondarySupport } from "@/lib/prisma-product-secondary-fallback";

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const adminListIncludeBase = {
    category: { select: { slug: true, nameEn: true, nameAr: true } },
    brandRef: { select: { slug: true, nameEn: true, nameAr: true } },
    images: { orderBy: { sortOrder: "asc" } as const },
  };

  try {
    let rows;
    try {
      rows = await prisma.product.findMany({
        include: {
          ...adminListIncludeBase,
          secondaryCategories: { select: { categoryId: true } },
        },
        orderBy: { id: "desc" },
        take: 200,
      });
    } catch (e) {
      if (!productQueryMissingSecondarySupport(e)) throw e;
      rows = await prisma.product.findMany({
        include: { ...adminListIncludeBase },
        orderBy: { id: "desc" },
        take: 200,
      });
    }
    return Response.json(rows);
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function POST(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
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
    images?: string[];
    specs?: Record<string, unknown>;
    secondaryCategoryIds?: number[];
  } | null;

  if (!body?.categoryId || !body.nameEn || typeof body.price !== "number") {
    return Response.json({ error: "categoryId, nameEn, price required" }, { status: 400 });
  }

  const specCheck = await validateProductSpecsAgainstCategory(body.categoryId, body.specs);
  if (!specCheck.ok) {
    return Response.json({ error: specCheck.error }, { status: 400 });
  }

  const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];

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
        specs: specCheck.specs as object,
        published: true,
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
    await logAdminAction("product.create", "Product", { entityId: product.id, payload: { nameEn: product.nameEn } });
    return Response.json({ id: product.id });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
