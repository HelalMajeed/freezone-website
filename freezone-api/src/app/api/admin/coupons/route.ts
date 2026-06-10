import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead, guardAdminMutate, auditContext } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

/**
 * Zod-formalized coupon write payload (ship run, ASSUMPTIONS A-16). Field
 * types deliberately mirror what the previous manual checks accepted so valid
 * callers are byte-identical; only wrong-typed payloads now get the standard
 * VALIDATION error. Defaults/normalization (trim, uppercase code, percent
 * fallback) stay in the handlers, unchanged.
 */
export const couponWriteSchema = z.object({
  code: z.string().optional(),
  labelAr: z.string().optional(),
  labelEn: z.string().optional(),
  discountType: z.enum(["percent", "fixed_iqd"]).optional(),
  discountValue: z.number().optional(),
  minSubtotal: z.number().optional(),
  active: z.boolean().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  usageLimit: z.number().nullable().optional(),
});

export function couponValidationError(error: z.ZodError): Response {
  const first = error.issues[0];
  return Response.json(
    { ok: false, error: first?.message ?? "بيانات غير صالحة", code: "VALIDATION" },
    { status: 400 },
  );
}

export async function GET(req: Request) {
  const auth = await guardAdminRead(req);
  if (!auth.ok) return auth.response;
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
  const auth = await guardAdminMutate(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const raw = await req.json().catch(() => null);
  /** `?? {}` keeps the historical "code required" answer for an empty/missing body. */
  const parsed = couponWriteSchema.safeParse(raw ?? {});
  if (!parsed.success) return couponValidationError(parsed.error);
  const body = parsed.data;

  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return Response.json({ error: "code required" }, { status: 400 });
  }

  const parseDate = (v: string | null | undefined): Date | null => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  };

  try {
    const row = await prisma.coupon.create({
      data: {
        code,
        labelAr: body.labelAr?.trim() || "",
        labelEn: body.labelEn?.trim() || "",
        discountType: body.discountType === "fixed_iqd" ? "fixed_iqd" : "percent",
        discountValue: typeof body.discountValue === "number" ? body.discountValue : 10,
        minSubtotal: typeof body.minSubtotal === "number" ? body.minSubtotal : 0,
        active: body.active !== false,
        startsAt: parseDate(body.startsAt),
        endsAt: parseDate(body.endsAt),
        usageLimit:
          typeof body.usageLimit === "number" && Number.isFinite(body.usageLimit)
            ? body.usageLimit
            : null,
      },
    });
    await logAdminAction("coupon.create", "Coupon", { ...auditContext(auth.actor, req), entityId: row.id, payload: { code: row.code } });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
