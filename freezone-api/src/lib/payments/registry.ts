import type { PaymentProvider } from "./types";
import { codProvider } from "./cod";
import { zaincashProvider } from "./zaincash";
import { qicardProvider } from "./qicard";
import { fibProvider } from "./fib";
import { cardProvider } from "./card";

/**
 * Checkout method key → provider mapping (API_CONTRACT §6, ASSUMPTIONS A-6).
 *
 * Method keys are what the storefront submits and what `Order.paymentMethod`
 * stores — the set matches values already in production order history, plus
 * the new `fib`. Non-gateway methods:
 *   - `store_pickup` settles like cod (cash at the counter) → cod provider;
 *   - `visa` / `master` both route to the single card adapter.
 */
export const PAYMENT_METHOD_KEYS = [
  "cod",
  "zaincash",
  "qicard",
  "fib",
  "visa",
  "master",
  "store_pickup",
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHOD_KEYS)[number];

const PROVIDER_BY_METHOD: Record<PaymentMethodKey, PaymentProvider> = {
  cod: codProvider,
  store_pickup: codProvider,
  zaincash: zaincashProvider,
  qicard: qicardProvider,
  fib: fibProvider,
  visa: cardProvider,
  master: cardProvider,
};

/** Bilingual storefront labels (server-resolved so the list is self-describing). */
const METHOD_LABELS: Record<PaymentMethodKey, { en: string; ar: string }> = {
  cod: { en: "Cash on delivery", ar: "الدفع عند الاستلام" },
  store_pickup: { en: "Cash at store (pickup)", ar: "نقداً عند الاستلام من المعرض" },
  zaincash: { en: "ZainCash", ar: "زين كاش" },
  qicard: { en: "Qi Card", ar: "كي كارد" },
  fib: { en: "FIB (First Iraqi Bank)", ar: "المصرف العراقي الأول (FIB)" },
  visa: { en: "Visa", ar: "فيزا" },
  master: { en: "Mastercard", ar: "ماستركارد" },
};

export function isPaymentMethodKey(value: unknown): value is PaymentMethodKey {
  return typeof value === "string" && (PAYMENT_METHOD_KEYS as readonly string[]).includes(value);
}

/** Provider that settles a given checkout method. */
export function providerForMethod(method: PaymentMethodKey): PaymentProvider {
  return PROVIDER_BY_METHOD[method];
}

/**
 * Whether checkout may accept this method right now. Cash methods (cod /
 * store_pickup) are always available; gateway methods require their provider
 * env keys — unconfigured gateways are rejected, never silently downgraded.
 */
export function isMethodAvailable(method: PaymentMethodKey): boolean {
  return PROVIDER_BY_METHOD[method].isConfigured();
}

export type PublicPaymentMethod = {
  key: PaymentMethodKey;
  enabled: boolean;
  comingSoon: boolean;
  labelEn: string;
  labelAr: string;
};

/** Projection for GET /api/public/payment-methods. */
export function listPublicPaymentMethods(): PublicPaymentMethod[] {
  return PAYMENT_METHOD_KEYS.map((key) => {
    const enabled = isMethodAvailable(key);
    return {
      key,
      enabled,
      comingSoon: !enabled,
      labelEn: METHOD_LABELS[key].en,
      labelAr: METHOD_LABELS[key].ar,
    };
  });
}
