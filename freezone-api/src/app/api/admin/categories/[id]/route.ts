import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { Prisma } from "@prisma/client";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { facetAttributesFromAdminFacetKeysBody } from "@/lib/facet-attributes";
import { syncCategoryAttributesFromFacetKeys } from "@/lib/classification/sync";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    nameEn?: string;
    nameAr?: string;
    slug?: string;
    parentId?: number | null;
    active?: boolean;
    icon?: string;
    color?: string;
    backgroundImageUrl?: string | null;
    sortOrder?: number;
    facetKeys?: unknown;
  } | null;

  if (!body) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  let facetKeysJson: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
  if (body.facetKeys !== undefined) {
    if (body.facetKeys === null) {
      facetKeysJson = Prisma.JsonNull;
    } else {
      const parsed = facetAttributesFromAdminFacetKeysBody(body.facetKeys);
      if (!parsed.ok) {
        return Response.json({ error: parsed.error }, { status: 400 });
      }
      facetKeysJson = parsed.attrs.length ? (parsed.attrs as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;
    }
  }

  try {
    const bgPatch =
      body.backgroundImageUrl === undefined
        ? {}
        : {
            backgroundImageUrl:
              body.backgroundImageUrl === null || String(body.backgroundImageUrl).trim() === ""
                ? null
                : String(body.backgroundImageUrl).trim(),
          };

    if (body.slug !== undefined) {
      const slug = body.slug.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
      if (slug) {
        const clash = await prisma.category.findFirst({ where: { slug, NOT: { id } } });
        if (clash) {
          return Response.json({ error: "slug already in use" }, { status: 409 });
        }
      }
    }

    if (body.parentId !== undefined && body.parentId !== null) {
      if (body.parentId === id) {
        return Response.json({ error: "category cannot be its own parent" }, { status: 400 });
      }
    }

    const slugPatch =
      body.slug !== undefined
        ? {
            slug: body.slug
              .trim()
              .toLowerCase()
              .replace(/[^\p{L}\p{N}]+/gu, "-")
              .replace(/^-|-$/g, "") || undefined,
          }
        : {};

    await prisma.category.update({
      where: { id },
      data: {
        ...(body.nameEn !== undefined ? { nameEn: body.nameEn } : {}),
        ...(body.nameAr !== undefined ? { nameAr: body.nameAr } : {}),
        ...(slugPatch.slug ? { slug: slugPatch.slug } : {}),
        ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.icon !== undefined ? { icon: body.icon } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...bgPatch,
        ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
        ...(facetKeysJson !== undefined ? { facetKeys: facetKeysJson } : {}),
      },
    });

    if (facetKeysJson !== undefined) {
      try {
        const facetPayload =
          facetKeysJson === Prisma.JsonNull
            ? []
            : (body.facetKeys as unknown);
        await syncCategoryAttributesFromFacetKeys(prisma, id, facetPayload ?? []);
      } catch (syncErr) {
        console.warn("[admin/categories] CategoryAttribute sync skipped:", syncErr);
      }
    }

    revalidateStorefrontData();
    await logAdminAction("category.update", "Category", { entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const primaryCount = await prisma.product.count({ where: { categoryId: id } });
    if (primaryCount > 0) {
      return Response.json(
        {
          error: "This category has products. Disable it instead of deleting.",
          productCount: primaryCount,
        },
        { status: 409 },
      );
    }

    await prisma.productSecondaryCategory.deleteMany({ where: { categoryId: id } });
    await prisma.category.delete({ where: { id } });

    revalidateStorefrontData();
    await logAdminAction("category.delete", "Category", { entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
