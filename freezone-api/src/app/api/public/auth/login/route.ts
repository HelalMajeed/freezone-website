import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { clientIpFromRequest, clientUserAgentFromRequest, jsonError } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { isValidIraqiPhone, normalizeIraqiPhone } from "@/lib/phone";
import {
  clearFailedCustomerLogins,
  createCustomerSession,
  isCustomerLocked,
  jsonWithCustomerCookie,
  publicCustomer,
  recordFailedCustomerLogin,
  verifyPassword,
} from "@/lib/customer-auth";

/**
 * POST /api/public/auth/login — customer sign-in (API_CONTRACT §2).
 *
 * Body `{ phone, password }`. Lockout after 5 failed attempts for 15 minutes
 * (`429 ACCOUNT_LOCKED`); blocked accounts get `403 ACCOUNT_BLOCKED`. Wrong
 * phone and wrong password both return `401 INVALID_CREDENTIALS` (no account
 * enumeration oracle). Rate limit 5/10min/IP lives in server.ts.
 */

const BodySchema = z.object({
  phone: z.string(),
  password: z.string(),
});

export async function POST(req: Request): Promise<Response> {
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.phone.trim() || !parsed.data.password) {
    return jsonError(400, "MISSING_CREDENTIALS");
  }
  const { password } = parsed.data;

  try {
    const customer = isValidIraqiPhone(parsed.data.phone)
      ? await prisma.customer.findUnique({ where: { phone: normalizeIraqiPhone(parsed.data.phone) } })
      : null;

    // Constant-time-ish behaviour: dummy verify when the account is missing so
    // attackers can't trivially time the response to enumerate phone numbers.
    if (!customer) {
      await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAA==");
      return jsonError(401, "INVALID_CREDENTIALS");
    }

    if (customer.isBlocked) return jsonError(403, "ACCOUNT_BLOCKED");
    if (isCustomerLocked(customer)) {
      return jsonError(429, "ACCOUNT_LOCKED", { until: customer.lockedUntil });
    }

    const ok = await verifyPassword(password, customer.passwordHash);
    if (!ok) {
      await recordFailedCustomerLogin(customer.id);
      return jsonError(401, "INVALID_CREDENTIALS");
    }

    await clearFailedCustomerLogins(customer.id);

    const { token } = await createCustomerSession({
      customerId: customer.id,
      userAgent: clientUserAgentFromRequest(req),
      ip: clientIpFromRequest(req),
    });

    return jsonWithCustomerCookie({ ok: true, customer: publicCustomer(customer) }, token);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
