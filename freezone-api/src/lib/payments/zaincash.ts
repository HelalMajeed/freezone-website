import { NotConfiguredError, envConfigured, type PaymentOrder, type PaymentProvider } from "./types";

const ENV_KEYS = ["ZAINCASH_MERCHANT_ID", "ZAINCASH_SECRET", "ZAINCASH_MSISDN"] as const;

/**
 * ZainCash wallet gateway. Configuration-gated: every operation throws
 * `NotConfiguredError` until the merchant credentials are provisioned.
 *
 * The transaction API call itself is NOT implemented yet — when credentials
 * exist, settlement is still coordinated manually (wallet number over
 * WhatsApp, admin records `paymentStatus`). Operations therefore throw an
 * explicit "not implemented" error instead of pretending a charge happened.
 */
export const zaincashProvider: PaymentProvider = {
  key: "zaincash",

  isConfigured(): boolean {
    return envConfigured(...ENV_KEYS);
  },

  async createPayment(_order: PaymentOrder): Promise<{ redirectUrl?: string; reference?: string }> {
    if (!this.isConfigured()) throw new NotConfiguredError("zaincash");
    throw new Error("zaincash createPayment: gateway API not implemented — settlement is manual; never simulate success");
  },

  async verifyCallback(_payload: unknown): Promise<{ orderId: number; paid: boolean }> {
    if (!this.isConfigured()) throw new NotConfiguredError("zaincash");
    throw new Error("zaincash verifyCallback: gateway API not implemented — never simulate success");
  },

  async refund(_order: PaymentOrder): Promise<void> {
    if (!this.isConfigured()) throw new NotConfiguredError("zaincash");
    throw new Error("zaincash refund: gateway API not implemented — refunds are manual");
  },
};
