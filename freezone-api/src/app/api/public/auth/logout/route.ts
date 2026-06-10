import { getCurrentCustomer, jsonClearCustomerCookie, revokeCustomerSession } from "@/lib/customer-auth";

/**
 * POST /api/public/auth/logout — revoke the current customer session and clear
 * the cookie. Always answers `{ ok: true }` (idempotent — logging out twice or
 * with no session is not an error).
 */
export async function POST(req: Request): Promise<Response> {
  const customer = await getCurrentCustomer(req).catch(() => null);
  if (customer) await revokeCustomerSession(customer.sessionId);
  return jsonClearCustomerCookie({ ok: true });
}
