/**
 * Payment provider abstraction (API_CONTRACT §6).
 *
 * One adapter per Iraqi payment rail lives in this directory. Adapters are
 * configuration-driven: `isConfigured()` checks the provider's env keys and
 * EVERY gateway operation throws `NotConfiguredError` when those keys are
 * absent — there is no silent fallback and absolutely no simulated success.
 *
 * Gateway env keys (set as Fly secrets, never committed):
 *   - ZainCash: ZAINCASH_MERCHANT_ID, ZAINCASH_SECRET, ZAINCASH_MSISDN
 *   - Qi Card:  QICARD_MERCHANT_ID, QICARD_API_KEY
 *   - FIB:      FIB_CLIENT_ID, FIB_CLIENT_SECRET
 *   - Card:     CARD_GATEWAY_KEY (visa/master both route here)
 */

export type PaymentProviderKey = "cod" | "zaincash" | "qicard" | "fib" | "card";

/** Minimal order projection a provider needs to act on. */
export type PaymentOrder = {
  id: number;
  orderNumber: string;
  /** Integer IQD */
  total: number;
  customerPhone?: string;
};

export interface PaymentProvider {
  key: PaymentProviderKey;
  /** Env-key based; cod is always configured. */
  isConfigured(): boolean;
  createPayment(order: PaymentOrder): Promise<{ redirectUrl?: string; reference?: string }>;
  verifyCallback(payload: unknown): Promise<{ orderId: number; paid: boolean }>;
  refund(order: PaymentOrder): Promise<void>;
}

/** Thrown by every adapter operation whose provider env keys are missing. */
export class NotConfiguredError extends Error {
  constructor(provider: PaymentProviderKey) {
    super(`Payment provider "${provider}" is not configured`);
    this.name = "NotConfiguredError";
  }
}

/** True when every named env var is present and non-empty (read at call time). */
export function envConfigured(...keys: string[]): boolean {
  return keys.every((k) => Boolean(process.env[k]?.trim()));
}
