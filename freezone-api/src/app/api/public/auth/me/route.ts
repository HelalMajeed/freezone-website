import { isDatabaseConfigured } from "@/lib/prisma";
import { jsonError } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { getCurrentCustomer, publicCustomer } from "@/lib/customer-auth";

/**
 * GET /api/public/auth/me — current signed-in customer (API_CONTRACT §2).
 * `{ ok, customer }` or `401 UNAUTHENTICATED`.
 */
export async function GET(req: Request): Promise<Response> {
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");
  try {
    const customer = await getCurrentCustomer(req);
    if (!customer) return jsonError(401, "UNAUTHENTICATED");
    return Response.json({ ok: true, customer: publicCustomer(customer) });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
