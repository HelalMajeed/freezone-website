import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { validateCouponRecord } from "@/lib/coupon-service";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "NO_DATABASE" }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as { code?: string; subtotal?: number } | null;
  const code = body?.code?.trim().toUpperCase();
  const subtotal = body?.subtotal;
  if (!code || typeof subtotal !== "number" || subtotal < 0) {
    return Response.json({ ok: false, error: "بيانات غير صالحة" }, { status: 400 });
  }

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
