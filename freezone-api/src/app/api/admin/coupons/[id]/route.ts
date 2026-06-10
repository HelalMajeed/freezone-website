import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminMutate, auditContext } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { couponValidationError, couponWriteSchema } from "../route";

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await guardAdminMutate(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  const raw = await req.json().catch(() => null);
  if (!raw) return Response.json({ error: "body" }, { status: 400 });
  /** Zod-formalized (ship run, A-16) — same accepted shapes as the previous
   *  manual checks; wrong-typed payloads get the standard VALIDATION error. */
  const parsed = couponWriteSchema.safeParse(raw);
  if (!parsed.success) return couponValidationError(parsed.error);
  const body = parsed.data;

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
    await logAdminAction("coupon.update", "Coupon", { ...auditContext(auth.actor, req), entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await guardAdminMutate(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  try {
    await prisma.coupon.delete({ where: { id } });
    await logAdminAction("coupon.delete", "Coupon", { ...auditContext(auth.actor, req), entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
