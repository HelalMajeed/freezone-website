import { prisma } from "@/lib/prisma";
import {
  clearFailedLogins,
  createSession,
  isUserLocked,
  isRole,
  jsonWithDashboardCookie,
  recordFailedLogin,
  verifyPassword,
} from "@/lib/dashboard-auth";
import { clientIpFromRequest, jsonError } from "@/lib/dashboard-guard";
import { signAdminSession } from "@/lib/admin-session";

/**
 * POST /api/dashboard/auth/login
 * Body: { email, password }
 *
 * On success sets TWO cookies:
 *  - fz_dashboard_session  → real source of truth (DB-backed)
 *  - fz_admin_session      → legacy HMAC cookie, so existing /api/admin/* routes
 *                            continue to work for the same logged-in user
 *                            without rewriting them.
 */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return jsonError(400, "MISSING_CREDENTIALS");
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });

  // Constant-time-ish behaviour: do a dummy verify if user is missing, so
  // attackers can't trivially time the response to enumerate emails.
  if (!user) {
    await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAA==");
    return jsonError(401, "INVALID_CREDENTIALS");
  }

  if (!user.active) return jsonError(403, "ACCOUNT_DISABLED");
  if (isUserLocked(user)) {
    return jsonError(429, "ACCOUNT_LOCKED", { until: user.lockedUntil });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await recordFailedLogin(user.id);
    return jsonError(401, "INVALID_CREDENTIALS");
  }

  if (!isRole(user.role)) {
    return jsonError(500, "BAD_ROLE_IN_DB");
  }

  await clearFailedLogins(user.id);

  const { token } = await createSession({
    userId: user.id,
    userAgent: req.headers.get("user-agent"),
    ip: clientIpFromRequest(req),
  });

  // Build response with new session cookie
  const res = jsonWithDashboardCookie(
    {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    },
    token,
  );

  // ALSO set legacy admin cookie so existing /api/admin/* routes work
  // without modification. The legacy cookie is a separate HMAC token.
  const legacyToken = signAdminSession();
  const ss = (process.env.ADMIN_SESSION_SAMESITE?.trim().toLowerCase() === "none"
    ? "None"
    : process.env.ADMIN_SESSION_SAMESITE?.trim().toLowerCase() === "strict"
      ? "Strict"
      : "Lax") as "Lax" | "Strict" | "None";
  const secure = process.env.NODE_ENV === "production" || ss === "None";
  const legacyParts = [
    `fz_admin_session=${encodeURIComponent(legacyToken)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${ss}`,
    `Max-Age=${7 * 24 * 60 * 60}`,
  ];
  if (secure) legacyParts.push("Secure");
  res.headers.append("Set-Cookie", legacyParts.join("; "));

  return res;
}
