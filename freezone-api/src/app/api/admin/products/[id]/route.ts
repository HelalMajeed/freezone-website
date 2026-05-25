import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate, guardAdminRead } from "@/lib/admin-route-guard";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import {
  adminProductSpecsForEdit,
  persistProductSpecsForProduct,
  validateProductSpecsAgainstCategory,
} from "@/lib/admin-product-specs";
import { loadCategoryAttributeSchema } from "@/lib/classification/persist";
import { categoryAttributeRowsToFacetDefs } from "@/lib/classification/sync";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";
import {
  replaceProductSecondaryCategories,
  stripSecondaryMatchingPrimary,
} from "@/lib/sync-product-secondary-categories";
import { productQueryMissingSecondarySupport } from "@/lib/prisma-product-secondary-fallback";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const readGuard = await guardAdminRead(req);
  if (!readGuard.ok) return readGuard.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  const adminOneIncludeBase = {
    category: {
      select: {
        id: true,
        slug: true,
        nameEn: true,
        categoryAttributes: { orderBy: { sortOrder: "asc" as const } },
      },
    },
    attributeValues: true,
    images: { orderBy: { sortOrder: "asc" } as const },
    brandRef: { select: { id: true, nameEn: true, nameAr: true } },
    /** Render variant list in admin edit screen + verify importer wrote them. */
    variants: { orderBy: { sortOrder: "asc" } as const },
  };

  try {
    let row;
    try {
      row = await prisma.product.findUnique({
        where: { id },
        include: {
          ...adminOneIncludeBase,
          secondaryCategories: { select: { categoryId: true } },
        },
      });
    } catch (e) {
      if (!productQueryMissingSecondarySupport(e)) throw e;
      row = await prisma.product.findUnique({
        where: { id },
        include: { ...adminOneIncludeBase },
      });
    }
    if (!row) return Response.json({ error: "not found" }, { status: 404 });

    const schema = await loadCategoryAttributeSchema(
      (args) => prisma.categoryAttribute.findMany(args),
      row.categoryId,
    );
    const attrs = schema.length
      ? categoryAttributeRowsToFacetDefs(schema)
      : [];
    const { displaySpecs, filterSpecs } = await adminProductSpecsForEdit(
      row.id,
      row.categoryId,
      row.specs,
    );
    const parts = partitionFacetAttributes(attrs);

    return Response.json({
      ...row,
      specs: displaySpecs,
      displaySpecs,
      filterSpecs,
      categoryAttributes: attrs,
      filterableAttributes: parts.filterableSpecs,
      extendedAttributes: parts.extendedSpecs,
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const mutateGuard = await guardAdminMutate(req);
  if (!mutateGuard.ok) return mutateGuard.response;
  const audit = auditContext(mutateGuard.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

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
    originalPrice?: number | null;
    warranty?: string;
    sourceUrl?: string | null;
    storage?: string;
    model3d?: string | null;
    specs?: Record<string, unknown> | null;
    inStock?: boolean;
    featured?: boolean;
    isNew?: boolean;
    icon?: string;
    rating?: number;
    reviews?: number;
    sales?: number;
    published?: boolean;
    secondaryCategoryIds?: number[] | null;
  } | null;
  if (!body) return Response.json({ error: "body" }, { status: 400 });

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return Response.json({ error: "not found" }, { status: 404 });

    const nextCategoryId = body.categoryId ?? existing.categoryId;
    let finalSpecs: object = (existing.specs as object) ?? {};

    if (body.specs !== undefined) {
      const specCheck = await validateProductSpecsAgainstCategory(nextCategoryId, body.specs);
      if (!specCheck.ok) {
        return Response.json({ error: specCheck.error }, { status: 400 });
      }

      const persisted = await persistProductSpecsForProduct(id, nextCategoryId, body.specs);
      if (!persisted.ok) {
        return Response.json({ error: persisted.error }, { status: 400 });
      }
      finalSpecs = persisted.specs;
    }

    await prisma.product.update({
      where: { id },
      data: {
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.brand !== undefined ? { brand: body.brand } : {}),
        ...(body.brandId !== undefined
          ? { brandId: body.brandId != null && Number.isFinite(body.brandId) ? body.brandId : null }
          : {}),
        ...(body.sku !== undefined ? { sku: body.sku.trim() || "—" } : {}),
        ...(body.model !== undefined ? { model: body.model.trim() } : {}),
        ...(typeof body.quantity === "number" ? { quantity: body.quantity } : {}),
        ...(body.nameEn !== undefined ? { nameEn: body.nameEn } : {}),
        ...(body.nameAr !== undefined ? { nameAr: body.nameAr } : {}),
        ...(body.descEn !== undefined ? { descEn: body.descEn } : {}),
        ...(body.descAr !== undefined ? { descAr: body.descAr } : {}),
        ...(typeof body.price === "number" ? { price: body.price } : {}),
        ...(body.oldPrice !== undefined ? { oldPrice: body.oldPrice } : {}),
        ...(body.originalPrice !== undefined ? { originalPrice: body.originalPrice } : {}),
        ...(body.warranty !== undefined ? { warranty: body.warranty.trim() } : {}),
        ...(body.sourceUrl !== undefined ? { sourceUrl: body.sourceUrl?.trim() || null } : {}),
        ...(body.storage !== undefined ? { storage: body.storage } : {}),
        ...(body.model3d !== undefined ? { model3d: body.model3d?.trim() || null } : {}),
        specs: finalSpecs as object,
        ...(body.inStock !== undefined ? { inStock: body.inStock } : {}),
        ...(body.featured !== undefined ? { featured: body.featured } : {}),
        ...(body.isNew !== undefined ? { isNew: body.isNew } : {}),
        ...(body.icon !== undefined ? { icon: body.icon } : {}),
        ...(typeof body.rating === "number" ? { rating: body.rating } : {}),
        ...(typeof body.reviews === "number" ? { reviews: body.reviews } : {}),
        ...(typeof body.sales === "number" ? { sales: body.sales } : {}),
        ...(body.published !== undefined ? { published: body.published } : {}),
      },
    });

    if (body.secondaryCategoryIds !== undefined) {
      await replaceProductSecondaryCategories(id, nextCategoryId, body.secondaryCategoryIds ?? []);
    } else if (body.categoryId !== undefined) {
      await stripSecondaryMatchingPrimary(id, nextCategoryId);
    }

    revalidateStorefrontData();
    await logAdminAction("product.update", "Product", { entityId: id, ...audit });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const mutateGuard = await guardAdminMutate(req);
  if (!mutateGuard.ok) return mutateGuard.response;
  const audit = auditContext(mutateGuard.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  try {
    await prisma.product.delete({ where: { id } });
    revalidateStorefrontData();
    await logAdminAction("product.delete", "Product", { entityId: id, ...audit });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
