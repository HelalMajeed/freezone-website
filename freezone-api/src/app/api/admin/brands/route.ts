import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate, guardAdminRead } from "@/lib/admin-route-guard";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

function slugify(s: string) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "brand"
  );
}

export async function GET(req: Request) {
  const readGuard = await guardAdminRead(req);
  if (!readGuard.ok) return readGuard.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  try {
    const rows = await prisma.brand.findMany({ orderBy: { sortOrder: "asc" } });
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
    nameEn?: string;
    nameAr?: string;
    slug?: string;
    logoUrl?: string | null;
    sortOrder?: number;
  } | null;

  const nameEn = body?.nameEn?.trim();
  const nameAr = body?.nameAr?.trim() || nameEn;
  if (!nameEn) return Response.json({ error: "nameEn required" }, { status: 400 });

  try {
    let slug = body?.slug?.trim() ? slugify(body.slug) : slugify(nameEn);
    const clash = await prisma.brand.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36)}`;

    const row = await prisma.brand.create({
      data: {
        slug,
        nameEn,
        nameAr: nameAr || nameEn,
        logoUrl: body?.logoUrl?.trim() || null,
        sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
      },
    });
    revalidateStorefrontData();
    await logAdminAction("brand.create", "Brand", {
      entityId: row.id,
      payload: { slug: row.slug },
      ...audit,
    });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
