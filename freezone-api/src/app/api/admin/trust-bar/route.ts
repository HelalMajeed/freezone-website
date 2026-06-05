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
    const rows = await prisma.trustBarItem.findMany({ orderBy: { sortOrder: "asc" } });
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
    textEn?: string;
    textAr?: string;
    iconKey?: string;
    sortOrder?: number;
  } | null;

  const textEn = body?.textEn?.trim();
  const textAr = body?.textAr?.trim() || textEn;
  if (!textEn) {
    return Response.json({ error: "textEn required" }, { status: 400 });
  }

  try {
    const row = await prisma.trustBarItem.create({
      data: {
        textEn,
        textAr: textAr || textEn,
        iconKey: body?.iconKey?.trim() || "truck",
        sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
      },
    });
    revalidateStorefrontData();
    await logAdminAction("trustBar.create", "TrustBarItem", { entityId: row.id });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
