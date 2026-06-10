import { listPublicPaymentMethods } from "@/lib/payments/registry";

/**
 * GET /api/public/payment-methods (API_CONTRACT §6).
 *
 * Storefront checkout renders its payment options from this list:
 * `{ ok, methods: [{ key, enabled, comingSoon, labelEn, labelAr }] }`.
 * cod / store_pickup are always enabled; gateway methods (zaincash, qicard,
 * fib, visa, master) stay `enabled:false, comingSoon:true` until their
 * provider env keys are provisioned. No DB access — config only.
 */
export async function GET() {
  return Response.json({ ok: true, methods: listPublicPaymentMethods() });
}
