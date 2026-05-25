import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminMutate, auditContext } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { persistProductSpecsForProduct } from "@/lib/admin-product-specs";
import { ACTIVE_PRODUCT_WHERE } from "@/lib/admin-product-scope";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const mutate = await guardAdminMutate(req);
  if (!mutate.ok) return mutate.response;
  const audit = auditContext(mutate.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "لا توجد قاعدة بيانات" }, { status: 503 });
  }
  const sourceId = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(sourceId)) {
    return Response.json({ ok: false, error: "معرّف غير صالح" }, { status: 400 });
  }

  try {
    const src = await prisma.product.findFirst({
      where: { id: sourceId, ...ACTIVE_PRODUCT_WHERE },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        attributeValues: true,
        secondaryCategories: true,
        variants: true,
      },
    });
    if (!src) {
      return Response.json({ ok: false, error: "المنتج غير موجود", code: "NOT_FOUND" }, { status: 404 });
    }

    const copySlug = src.slug ? `${src.slug}-copy-${Date.now().toString(36)}` : null;
    const copySku = src.sku && src.sku !== "—" ? `${src.sku}-COPY-${Date.now().toString(36).slice(-4)}` : "—";

    const created = await prisma.product.create({
      data: {
        categoryId: src.categoryId,
        brand: src.brand,
        brandId: src.brandId,
        sku: copySku,
        model: src.model,
        slug: copySlug,
        nameEn: `${src.nameEn} (نسخة)`,
        nameAr: `${src.nameAr} (نسخة)`,
        shortDescEn: src.shortDescEn,
        shortDescAr: src.shortDescAr,
        descEn: src.descEn,
        descAr: src.descAr,
        keyFeatures: src.keyFeatures ?? undefined,
        whatsInBox: src.whatsInBox ?? undefined,
        catalogStatus: "DRAFT",
        availability: src.availability,
        price: src.price,
        priceUsd: src.priceUsd,
        costPrice: src.costPrice,
        salePrice: src.salePrice,
        saleStartAt: src.saleStartAt,
        saleEndAt: src.saleEndAt,
        lowStockThreshold: src.lowStockThreshold,
        prepTimeDays: src.prepTimeDays,
        metaTitleEn: src.metaTitleEn,
        metaTitleAr: src.metaTitleAr,
        metaDescEn: src.metaDescEn,
        metaDescAr: src.metaDescAr,
        seoKeywords: src.seoKeywords ?? undefined,
        weightKg: src.weightKg,
        dimLengthCm: src.dimLengthCm,
        dimWidthCm: src.dimWidthCm,
        dimHeightCm: src.dimHeightCm,
        requiresSpecialHandling: src.requiresSpecialHandling,
        excludedProvinces: src.excludedProvinces ?? undefined,
        quantity: src.quantity,
        specs: src.specs ?? undefined,
        inStock: src.inStock,
        featured: false,
        isNew: src.isNew,
        published: false,
        warranty: src.warranty,
        storage: src.storage,
        createdById: mutate.actor.kind === "dashboard" ? mutate.actor.user.id : null,
      },
    });

    if (src.specs) {
      await persistProductSpecsForProduct(created.id, created.categoryId, src.specs as Record<string, unknown>);
    }

    for (const img of src.images) {
      await prisma.productImage.create({
        data: {
          productId: created.id,
          url: img.url,
          urlW200: img.urlW200,
          urlW400: img.urlW400,
          urlW800: img.urlW800,
          altTextAr: img.altTextAr,
          altTextEn: img.altTextEn,
          sortOrder: img.sortOrder,
          isCover: img.isCover,
        },
      });
    }

    for (const sec of src.secondaryCategories) {
      await prisma.productSecondaryCategory.create({
        data: { productId: created.id, categoryId: sec.categoryId },
      });
    }

    await logAdminAction("product.duplicate", "Product", {
      entityId: created.id,
      payload: { from: sourceId },
      ...audit,
    });

    return Response.json({ ok: true, data: { id: created.id } }, { status: 201 });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
