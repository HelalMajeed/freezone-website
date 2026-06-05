import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    code?: string;
    labelAr?: string;
    labelEn?: string;
    discountType?: string;
    discountValue?: number;
    minSubtotal?: number;
    active?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
    usageLimit?: number | null;
  } | null;
  if (!body) return Response.json({ error: "body" }, { status: 400 });

  try {
    await prisma.coupon.update({
      where: { id },
      data: {
        ...(body.code !== undefined ? { code: body.code.trim().toUpperCase() } : {}),
        ...(body.labelAr !== undefined ? { labelAr: body.labelAr } : {}),
        ...(body.labelEn !== undefined ? { labelEn: body.labelEn } : {}),
        ...(body.discountType !== undefined
          ? { discountType: body.discountType === "fixed_iqd" ? "fixed_iqd" : "percent" }
          : {}),
        ...(typeof body.discountValue === "number"
          ? { discountValue: body.discountValue }
          : {}),
        ...(typeof body.minSubtotal === "number"
          ? { minSubtotal: body.minSubtotal }
          : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.startsAt !== undefined ? { startsAt: parseDate(body.startsAt) } : {}),
        ...(body.endsAt !== undefined ? { endsAt: parseDate(body.endsAt) } : {}),
        ...(body.usageLimit !== undefined
          ? {
              usageLimit:
                typeof body.usageLimit === "number" && Number.isFinite(body.usageLimit)
                  ? body.usageLimit
                  : null,
            }
          : {}),
      },
    });
    await logAdminAction("coupon.update", "Coupon", { entityId: id });
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
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  try {
    await prisma.coupon.delete({ where: { id } });
    await logAdminAction("coupon.delete", "Coupon", { entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
