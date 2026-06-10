import { NotConfiguredError, envConfigured, type PaymentOrder, type PaymentProvider } from "./types";

const ENV_KEYS = ["FIB_CLIENT_ID", "FIB_CLIENT_SECRET"] as const;

/**
 * First Iraqi Bank (FIB) online payments. Configuration-gated: every operation
 * throws `NotConfiguredError` until OAuth client credentials are provisioned,
 * and an explicit "not implemented" error afterwards — success is never
 * simulated.
 */
export const fibProvider: PaymentProvider = {
  key: "fib",

  isConfigured(): boolean {
    return envConfigured(...ENV_KEYS);
  },

  async createPayment(_order: PaymentOrder): Promise<{ redirectUrl?: string; reference?: string }> {
    if (!this.isConfigured()) throw new NotConfiguredError("fib");
    throw new Error("fib createPayment: gateway API not implemented — never simulate success");
  },

  async verifyCallback(_payload: unknown): Promise<{ orderId: number; paid: boolean }> {
    if (!this.isConfigured()) throw new NotConfiguredError("fib");
    throw new Error("fib verifyCallback: gateway API not implemented — never simulate success");
  },

  async refund(_order: PaymentOrder): Promise<void> {
    if (!this.isConfigured()) throw new NotConfiguredError("fib");
    throw new Error("fib refund: gateway API not implemented — refunds are manual");
  },
};
