import type { PaymentOrder, PaymentProvider } from "./types";

/**
 * Cash on delivery — the fully working default rail (also backs the
 * `store_pickup` method: cash at the counter instead of cash to the courier).
 *
 * COD has no gateway, so the adapter's semantics are deliberately offline:
 *   - `createPayment` "succeeds" immediately — the reference is the order
 *     number itself; settlement happens in cash on handover.
 *   - `verifyCallback` never confirms payment (there is no callback channel);
 *     an admin flips `Order.paymentStatus` to "paid" after the cash is in hand.
 *   - `refund` is a no-op: cash refunds are handled manually and recorded by
 *     setting `paymentStatus` to "refunded".
 */
export const codProvider: PaymentProvider = {
  key: "cod",

  isConfigured(): boolean {
    return true;
  },

  async createPayment(order: PaymentOrder): Promise<{ redirectUrl?: string; reference?: string }> {
    return { reference: order.orderNumber };
  },

  async verifyCallback(payload: unknown): Promise<{ orderId: number; paid: boolean }> {
    const orderId =
      payload && typeof payload === "object" && "orderId" in payload
        ? Number((payload as { orderId: unknown }).orderId)
        : NaN;
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new Error("cod verifyCallback: payload.orderId required");
    }
    /** Cash is settled offline — a callback can never mark a COD order paid. */
    return { orderId, paid: false };
  },

  async refund(): Promise<void> {
    /** Manual cash refund — nothing to call; admin records paymentStatus=refunded. */
  },
};
