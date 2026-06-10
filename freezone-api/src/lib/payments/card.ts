import { NotConfiguredError, envConfigured, type PaymentOrder, type PaymentProvider } from "./types";

const ENV_KEYS = ["CARD_GATEWAY_KEY"] as const;

/**
 * Card gateway (Visa / Mastercard both route here — see registry.ts).
 * Configuration-gated: every operation throws `NotConfiguredError` until a
 * gateway key is provisioned, and an explicit "not implemented" error
 * afterwards (the live flow agrees card payment over WhatsApp / POS; this
 * site never charges cards and never simulates success).
 */
export const cardProvider: PaymentProvider = {
  key: "card",

  isConfigured(): boolean {
    return envConfigured(...ENV_KEYS);
  },

  async createPayment(_order: PaymentOrder): Promise<{ redirectUrl?: string; reference?: string }> {
    if (!this.isConfigured()) throw new NotConfiguredError("card");
    throw new Error("card createPayment: gateway API not implemented — never simulate success");
  },

  async verifyCallback(_payload: unknown): Promise<{ orderId: number; paid: boolean }> {
    if (!this.isConfigured()) throw new NotConfiguredError("card");
    throw new Error("card verifyCallback: gateway API not implemented — never simulate success");
  },

  async refund(_order: PaymentOrder): Promise<void> {
    if (!this.isConfigured()) throw new NotConfiguredError("card");
    throw new Error("card refund: gateway API not implemented — refunds are manual");
  },
};
