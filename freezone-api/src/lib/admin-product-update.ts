import type { AdminRole, Prisma, Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminProductPatchBody } from "@/lib/admin-product-patch";
import { sanitizeRichHtml } from "@/lib/html-sanitize";
import { canTransitionCatalogStatus, publishedFromCatalogStatus } from "@/lib/product-workflow";

export async function buildProductUpdateData(
  existing: Product,
  body: AdminProductPatchBody,
  role: AdminRole,
): Promise<
  { ok: true; data: Prisma.ProductUncheckedUpdateInput } | { ok: false; error: string; status: number }
> {
  let nextStatus = existing.catalogStatus;
  if (body.submitForReview) nextStatus = "PENDING_REVIEW";
  else if (body.catalogStatus) nextStatus = body.catalogStatus;

  if (
    nextStatus !== existing.catalogStatus &&
    !canTransitionCatalogStatus(existing.catalogStatus, nextStatus, role)
  ) {
    return { ok: false, error: "لا يمكن تغيير حالة المنتج بهذه الصلاحية", status: 403 };
  }

  if (body.slug !== undefined && body.slug) {
    const clash = await prisma.product.findFirst({
      where: { slug: body.slug, id: { not: existing.id } },
      select: { id: true },
    });
    if (clash) {
      return { ok: false, error: "الرابط (slug) مستخدم لمنتج آخر", status: 409 };
    }
  }

  const data: Prisma.ProductUncheckedUpdateInput = {};

  if (body.categoryId !== undefined) data.categoryId = body.categoryId;
  if (body.brand !== undefined) data.brand = body.brand;
  if (body.brandId !== undefined) {
    data.brandId = body.brandId != null && Number.isFinite(body.brandId) ? body.brandId : null;
  }
  if (body.sku !== undefined) data.sku = body.sku.trim() || "—";
  if (body.model !== undefined) data.model = body.model.trim();
  if (typeof body.quantity === "number") data.quantity = body.quantity;
  if (body.slug !== undefined) data.slug = body.slug?.trim() || null;
  if (body.nameEn !== undefined) data.nameEn = body.nameEn;
  if (body.nameAr !== undefined) data.nameAr = body.nameAr;
  if (body.shortDescEn !== undefined) data.shortDescEn = body.shortDescEn;
  if (body.shortDescAr !== undefined) data.shortDescAr = body.shortDescAr;
  if (body.descEn !== undefined) data.descEn = sanitizeRichHtml(body.descEn);
  if (body.descAr !== undefined) data.descAr = sanitizeRichHtml(body.descAr);
  if (body.keyFeatures !== undefined) data.keyFeatures = body.keyFeatures;
  if (body.whatsInBox !== undefined) data.whatsInBox = body.whatsInBox;
  if (body.availability !== undefined) data.availability = body.availability;
  if (typeof body.price === "number") data.price = body.price;
  if (body.priceUsd !== undefined) data.priceUsd = body.priceUsd;
  if (body.costPrice !== undefined) {
    if (role === "CATALOG_EDITOR") {
      return { ok: false, error: "سعر التكلفة متاح لمدير الكتالوج فقط", status: 403 };
    }
    data.costPrice = body.costPrice;
  }
  if (body.salePrice !== undefined) data.salePrice = body.salePrice;
  if (body.saleStartAt !== undefined) {
    data.saleStartAt = body.saleStartAt ? new Date(body.saleStartAt) : null;
  }
  if (body.saleEndAt !== undefined) {
    data.saleEndAt = body.saleEndAt ? new Date(body.saleEndAt) : null;
  }
  if (typeof body.lowStockThreshold === "number") data.lowStockThreshold = body.lowStockThreshold;
  if (typeof body.prepTimeDays === "number") data.prepTimeDays = body.prepTimeDays;
  if (body.metaTitleEn !== undefined) data.metaTitleEn = body.metaTitleEn;
  if (body.metaTitleAr !== undefined) data.metaTitleAr = body.metaTitleAr;
  if (body.metaDescEn !== undefined) data.metaDescEn = body.metaDescEn;
  if (body.metaDescAr !== undefined) data.metaDescAr = body.metaDescAr;
  if (body.seoKeywords !== undefined) data.seoKeywords = body.seoKeywords;
  if (body.weightKg !== undefined) data.weightKg = body.weightKg;
  if (body.dimLengthCm !== undefined) data.dimLengthCm = body.dimLengthCm;
  if (body.dimWidthCm !== undefined) data.dimWidthCm = body.dimWidthCm;
  if (body.dimHeightCm !== undefined) data.dimHeightCm = body.dimHeightCm;
  if (body.requiresSpecialHandling !== undefined) {
    data.requiresSpecialHandling = body.requiresSpecialHandling;
  }
  if (body.excludedProvinces !== undefined) data.excludedProvinces = body.excludedProvinces;
  if (body.internalNotes !== undefined) data.internalNotes = body.internalNotes;
  if (body.sourceSupplier !== undefined) data.sourceSupplier = body.sourceSupplier;
  if (body.purchaseInvoiceRef !== undefined) data.purchaseInvoiceRef = body.purchaseInvoiceRef;
  if (body.reviewNotes !== undefined) data.reviewNotes = body.reviewNotes;
  if (body.oldPrice !== undefined) data.oldPrice = body.oldPrice;
  if (body.originalPrice !== undefined) data.originalPrice = body.originalPrice;
  if (body.warranty !== undefined) data.warranty = body.warranty.trim();
  if (body.sourceUrl !== undefined) data.sourceUrl = body.sourceUrl?.trim() || null;
  if (body.storage !== undefined) data.storage = body.storage;
  if (body.model3d !== undefined) data.model3d = body.model3d?.trim() || null;
  if (body.inStock !== undefined) data.inStock = body.inStock;
  /** Keep inStock consistent with an edited quantity (mirrors the order/cancel
   *  reconciliation): quantity 0 always forces out-of-stock, and a positive
   *  restock flips it back in-stock unless inStock was set explicitly in this
   *  same request. Without this, editing quantity to 0 leaves a product showing
   *  "in stock" with none left, and restocking a 0-qty product leaves it hidden. */
  if (typeof body.quantity === "number") {
    if (body.quantity === 0) data.inStock = false;
    else if (body.inStock === undefined) data.inStock = true;
  }
  if (body.featured !== undefined) data.featured = body.featured;
  if (body.isNew !== undefined) data.isNew = body.isNew;
  if (body.icon !== undefined) data.icon = body.icon;
  if (typeof body.rating === "number") data.rating = body.rating;
  if (typeof body.reviews === "number") data.reviews = body.reviews;
  if (typeof body.sales === "number") data.sales = body.sales;

  if (nextStatus !== existing.catalogStatus) {
    data.catalogStatus = nextStatus;
    data.published = publishedFromCatalogStatus(nextStatus);
    if (nextStatus === "PENDING_REVIEW") data.submittedAt = new Date();
  } else if (body.published !== undefined) {
    data.published = body.published;
  }

  return { ok: true, data };
}
