import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate, guardAdminRead } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { logAdminAction } from "@/lib/admin-audit";
import { facetAttributesFromAdminFacetKeysBody } from "@/lib/facet-attributes";
import { categoryAttributeRowsToFacetDefs, syncCategoryAttributesFromFacetKeys } from "@/lib/classification/sync";

function slugify(s: string) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "category"
  );
}

export async function GET(req: Request) {
  const readGuard = await guardAdminRead(req);
  if (!readGuard.ok) return readGuard.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  try {
    let rows;
    try {
      rows = await prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { products: true, secondaryProductLinks: true } },
          categoryAttributes: { orderBy: { sortOrder: "asc" } },
        },
      });
    } catch {
      rows = await prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: true, secondaryProductLinks: true } } },
      });
    }
    return Response.json(
      rows.map(({ _count, ...row }) => {
        const catAttrs =
          "categoryAttributes" in row &&
          Array.isArray((row as { categoryAttributes?: unknown }).categoryAttributes)
            ? (row as { categoryAttributes: Parameters<typeof categoryAttributeRowsToFacetDefs>[0] })
                .categoryAttributes
            : [];
        const attrs = catAttrs.length ? categoryAttributeRowsToFacetDefs(catAttrs) : null;
        return {
          ...row,
          categoryAttributes: attrs ?? [],
          facetKeys: attrs?.length ? attrs : row.facetKeys,
          primaryProductCount: _count.products,
          secondaryLinkCount: _count.secondaryProductLinks,
        };
      }),
    );
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

  const nameEn = body?.nameEn?.trim();
  const nameAr = body?.nameAr?.trim() || nameEn;
  if (!nameEn) {
    return Response.json({ error: "nameEn required" }, { status: 400 });
  }

  let slug = body?.slug?.trim() ? slugify(body.slug) : slugify(nameEn);
  const clash = await prisma.category.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const facetKeysRaw = body?.facetKeys;
  let facetKeys: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
  if (facetKeysRaw === null) {
    facetKeys = Prisma.JsonNull;
  } else if (facetKeysRaw !== undefined) {
    const parsed = facetAttributesFromAdminFacetKeysBody(facetKeysRaw);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    facetKeys = parsed.attrs.length ? (parsed.attrs as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;
  }

  try {
    const bg =
      body?.backgroundImageUrl != null && String(body.backgroundImageUrl).trim() !== ""
        ? String(body.backgroundImageUrl).trim()
        : null;

    const row = await prisma.category.create({
      data: {
        slug,
        nameEn,
        nameAr: nameAr || nameEn,
        parentId:
          body?.parentId != null && Number.isFinite(body.parentId) ? body.parentId : null,
        active: body?.active !== false,
        icon: body?.icon?.trim() ?? "",
        color: body?.color?.trim() || "#64748b",
        backgroundImageUrl: bg,
        sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 999,
        ...(facetKeys !== undefined ? { facetKeys } : {}),
      },
    });
    if (facetKeys !== undefined) {
      try {
        const facetPayload = facetKeys === Prisma.JsonNull ? [] : (body?.facetKeys ?? []);
        await syncCategoryAttributesFromFacetKeys(prisma, row.id, facetPayload);
      } catch (syncErr) {
        console.warn("[admin/categories] CategoryAttribute sync on create skipped:", syncErr);
      }
    }
    revalidateStorefrontData();
    await logAdminAction("category.create", "Category", {
      entityId: row.id,
      payload: { slug: row.slug },
      ...audit,
    });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
