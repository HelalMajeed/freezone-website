import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
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
    const rows = await prisma.coupon.findMany({ orderBy: { id: "asc" } });
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
    code?: string;
    labelAr?: string;
    labelEn?: string;
    discountType?: string;
    discountValue?: number;
    minSubtotal?: number;
    active?: boolean;
  } | null;

  const code = body?.code?.trim().toUpperCase();
  if (!code) {
    return Response.json({ error: "code required" }, { status: 400 });
  }

  try {
    const row = await prisma.coupon.create({
      data: {
        code,
        labelAr: body?.labelAr?.trim() || "",
        labelEn: body?.labelEn?.trim() || "",
        discountType: body?.discountType === "fixed_iqd" ? "fixed_iqd" : "percent",
        discountValue: typeof body?.discountValue === "number" ? body.discountValue : 10,
        minSubtotal: typeof body?.minSubtotal === "number" ? body.minSubtotal : 0,
        active: body?.active !== false,
      },
    });
    await logAdminAction("coupon.create", "Coupon", { entityId: row.id, payload: { code: row.code } });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
