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
import { parseAdminProductPatch } from "@/lib/admin-product-patch";
import { buildProductUpdateData } from "@/lib/admin-product-update";
import type { AdminRole } from "@prisma/client";

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

  const raw = await req.json().catch(() => null);
  const parsed = parseAdminProductPatch(raw);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error, code: "VALIDATION" }, { status: 400 });
  }
  const body = parsed.data;

  const role: AdminRole =
    mutateGuard.actor.kind === "dashboard" ? mutateGuard.actor.user.role : "SUPER_ADMIN";

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return Response.json({ error: "not found" }, { status: 404 });

    const built = await buildProductUpdateData(existing, body, role);
    if (!built.ok) {
      return Response.json({ ok: false, error: built.error, code: "FORBIDDEN" }, { status: built.status });
    }

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
      data: { ...built.data, specs: finalSpecs as object },
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
