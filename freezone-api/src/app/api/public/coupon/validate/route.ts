import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { validateCouponRecord } from "@/lib/coupon-service";

/** Same accepted payload as the original manual checks, formalized with zod
 *  (additionally rejects NaN/Infinity subtotals). Error body is unchanged. */
const BodySchema = z.object({
  code: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .pipe(z.string().min(1)),
  subtotal: z.number().finite().min(0),
});

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "NO_DATABASE" }, { status: 503 });
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { code, subtotal } = parsed.data;

  const c = await prisma.coupon.findUnique({ where: { code } });
  const r = validateCouponRecord(c, subtotal);
  if (!r.ok) {
    return Response.json({ ok: false, error: r.error });
  }
  return Response.json({
    ok: true,
    discount: r.discount,
    code: r.code,
    couponId: r.couponId,
  });
}
