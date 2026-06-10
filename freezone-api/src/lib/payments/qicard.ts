import { NotConfiguredError, envConfigured, type PaymentOrder, type PaymentProvider } from "./types";

const ENV_KEYS = ["QICARD_MERCHANT_ID", "QICARD_API_KEY"] as const;

/**
 * Qi Card gateway. Configuration-gated: every operation throws
 * `NotConfiguredError` until merchant credentials are provisioned, and an
 * explicit "not implemented" error afterwards (the live flow settles Qi Card
 * manually via WhatsApp; success is never simulated).
 */
export const qicardProvider: PaymentProvider = {
  key: "qicard",

  isConfigured(): boolean {
    return envConfigured(...ENV_KEYS);
  },

  async createPayment(_order: PaymentOrder): Promise<{ redirectUrl?: string; reference?: string }> {
    if (!this.isConfigured()) throw new NotConfiguredError("qicard");
    throw new Error("qicard createPayment: gateway API not implemented — settlement is manual; never simulate success");
  },

  async verifyCallback(_payload: unknown): Promise<{ orderId: number; paid: boolean }> {
    if (!this.isConfigured()) throw new NotConfiguredError("qicard");
    throw new Error("qicard verifyCallback: gateway API not implemented — never simulate success");
  },

  async refund(_order: PaymentOrder): Promise<void> {
    if (!this.isConfigured()) throw new NotConfiguredError("qicard");
    throw new Error("qicard refund: gateway API not implemented — refunds are manual");
  },
};
