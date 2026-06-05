import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  try {
    const rows = await prisma.promoBanner.findMany({ orderBy: { sortOrder: "asc" } });
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
    titleEn?: string;
    titleAr?: string;
    subEn?: string;
    subAr?: string;
    imageUrl?: string;
    href?: string;
    catSlug?: string | null;
    sortOrder?: number;
    active?: boolean;
  } | null;

  const titleEn = body?.titleEn?.trim();
  const titleAr = body?.titleAr?.trim() || titleEn;
  const imageUrl = body?.imageUrl?.trim();
  if (!titleEn || !imageUrl) {
    return Response.json({ error: "titleEn and imageUrl required" }, { status: 400 });
  }

  try {
    const row = await prisma.promoBanner.create({
      data: {
        titleEn,
        titleAr: titleAr || titleEn,
        subEn: body?.subEn?.trim() ?? "",
        subAr: body?.subAr?.trim() ?? "",
        imageUrl,
        href: body?.href?.trim() || "/products",
        catSlug: body?.catSlug?.trim() || null,
        sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
        active: body?.active !== false,
      },
    });
    revalidateStorefrontData();
    await logAdminAction("promoBanner.create", "PromoBanner", { entityId: row.id });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
