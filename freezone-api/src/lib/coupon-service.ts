export type Coupon = {
  id: number;
  code: string;
  active: boolean;
  discountType: string;
  discountValue: number;
  minSubtotal: number;
  usageLimit: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type CouponValidationOk = {
  ok: true;
  discount: number;
  couponId: number;
  code: string;
};

export type CouponValidationErr = {
  ok: false;
  error: string;
};

export type CouponValidationResult = CouponValidationOk | CouponValidationErr;

function inWindow(c: Coupon, now: Date): boolean {
  if (c.startsAt && c.startsAt > now) return false;
  if (c.endsAt && c.endsAt < now) return false;
  return true;
}

export function computeDiscountForCoupon(c: Coupon, subtotal: number): number {
  if (c.discountType === "fixed_iqd") {
    return Math.min(Math.max(0, c.discountValue), subtotal);
  }
  const pct = Math.min(100, Math.max(0, c.discountValue));
  return Math.floor((subtotal * pct) / 100);
}

/** Pure validation given a loaded coupon row */
export function validateCouponRecord(c: Coupon | null, subtotal: number, now = new Date()): CouponValidationResult {
  if (!c) return { ok: false, error: "رمز غير صالح" };
  if (!c.active) return { ok: false, error: "الكوبون غير مفعّل" };
  if (!inWindow(c, now)) return { ok: false, error: "الكوبون خارج فترة الصلاحية" };
  if (subtotal < c.minSubtotal) {
    return { ok: false, error: `الحد الأدنى للطلب ${c.minSubtotal.toLocaleString("ar-IQ")} د.ع` };
  }
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) {
    return { ok: false, error: "استُنفدت حصة هذا الكوبون" };
  }
  const discount = computeDiscountForCoupon(c, subtotal);
  if (discount <= 0) return { ok: false, error: "لا يمكن تطبيق خصم على هذا المبلغ" };
  return { ok: true, discount, couponId: c.id, code: c.code };
}
