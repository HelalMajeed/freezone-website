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
    const rows = await prisma.homeSpotlightItem.findMany({ orderBy: { sortOrder: "asc" } });
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
    labelEn?: string;
    labelAr?: string;
    href?: string;
    imageUrl?: string | null;
    iconKey?: string | null;
    sortOrder?: number;
    active?: boolean;
  } | null;

  const labelEn = body?.labelEn?.trim();
  const labelAr = body?.labelAr?.trim() || labelEn;
  if (!labelEn) {
    return Response.json({ error: "labelEn required" }, { status: 400 });
  }

  try {
    const row = await prisma.homeSpotlightItem.create({
      data: {
        labelEn,
        labelAr: labelAr || labelEn,
        href: body?.href?.trim() || "/products",
        imageUrl: body?.imageUrl?.trim() || null,
        iconKey: body?.iconKey?.trim() || null,
        sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
        active: body?.active !== false,
      },
    });
    revalidateStorefrontData();
    await logAdminAction("homeSpotlight.create", "HomeSpotlightItem", { entityId: row.id });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
