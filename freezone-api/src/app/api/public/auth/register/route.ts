import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { clientIpFromRequest, clientUserAgentFromRequest, jsonError } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { stripHtml } from "@/lib/html-sanitize";
import { isValidIraqiPhone, normalizeIraqiPhone } from "@/lib/phone";
import {
  createCustomerSession,
  hashCustomerPassword,
  jsonWithCustomerCookie,
  publicCustomer,
} from "@/lib/customer-auth";

/**
 * POST /api/public/auth/register — create a customer account (API_CONTRACT §2).
 *
 * Body `{ name, phone, password (≥8), email? }`. Phone is normalized to the
 * canonical `07XXXXXXXXX` form before storing. Responds `201 { ok, customer }`
 * and sets the `fz_customer_session` cookie. Errors: `INVALID_PHONE`,
 * `WEAK_PASSWORD`, `PHONE_TAKEN` (409), `VALIDATION`.
 * Rate limit 5/10min/IP lives in server.ts (lib/rate-rules.ts).
 */

const BodySchema = z.object({
  name: z.string(),
  phone: z.string(),
  password: z.string(),
  email: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "VALIDATION");

  const name = stripHtml(parsed.data.name).trim().slice(0, 120);
  if (name.length < 2) return jsonError(400, "VALIDATION", { fields: ["name"] });

  if (!isValidIraqiPhone(parsed.data.phone)) return jsonError(400, "INVALID_PHONE");
  const phone = normalizeIraqiPhone(parsed.data.phone);

  const password = parsed.data.password;
  if (password.length < 8) return jsonError(400, "WEAK_PASSWORD");
  if (password.length > 200) return jsonError(400, "VALIDATION", { fields: ["password"] });

  const emailRaw = (parsed.data.email ?? "").trim();
  if (emailRaw && !z.email().max(254).safeParse(emailRaw).success) {
    return jsonError(400, "VALIDATION", { fields: ["email"] });
  }
  const email = emailRaw ? emailRaw.toLowerCase() : null;

  try {
    const existing = await prisma.customer.findUnique({ where: { phone }, select: { id: true } });
    if (existing) return jsonError(409, "PHONE_TAKEN");

    const passwordHash = await hashCustomerPassword(password);
    const customer = await prisma.customer.create({
      data: { name, phone, email, passwordHash },
    });

    const { token } = await createCustomerSession({
      customerId: customer.id,
      userAgent: clientUserAgentFromRequest(req),
      ip: clientIpFromRequest(req),
    });

    return jsonWithCustomerCookie({ ok: true, customer: publicCustomer(customer) }, token, 201);
  } catch (e) {
    /** Unique-constraint race on phone (two concurrent registers) → same error as the pre-check. */
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      return jsonError(409, "PHONE_TAKEN");
    }
    return handleRouteDbError(e);
  }
}
