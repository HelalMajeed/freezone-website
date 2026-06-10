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
import {
  clientIpFromRequest,
  clientUserAgentFromRequest,
  jsonError,
} from "@/lib/dashboard-guard";
import { signAdminSession } from "@/lib/admin-session";
import { isValidIraqiPhone, normalizeIraqiPhone } from "@/lib/phone";
import { logAdminAction } from "@/lib/admin-audit";

/**
 * POST /api/dashboard/auth/login
 * Body: { identifier, password } — identifier is an email (contains "@") or an
 * Iraqi phone (07XXXXXXXXX, Arabic-indic digits and +964 prefixes accepted).
 * The legacy { email, password } body is still accepted.
 *
 * Every attempt is audited: `auth.login` on success, `auth.login-failed` on
 * failure (with ip + user-agent, never the password).
 *
 * On success sets TWO cookies:
 *  - fz_dashboard_session  → real source of truth (DB-backed)
 *  - fz_admin_session      → legacy HMAC cookie, so existing /api/admin/* routes
 *                            continue to work for the same logged-in user
 *                            without rewriting them.
 */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    identifier?: string;
    email?: string;
    password?: string;
  };
  const identifier = (body.identifier ?? body.email ?? "").trim();
  const password = body.password ?? "";

  if (!identifier || !password) {
    return jsonError(400, "MISSING_CREDENTIALS");
  }

  const ip = clientIpFromRequest(req);
  const userAgent = clientUserAgentFromRequest(req);
  const isEmail = identifier.includes("@");

  const auditFailure = (reason: string, userId?: number) =>
    logAdminAction({
      action: "auth.login-failed",
      entity: "auth",
      entityId: userId ?? null,
      after: { identifier, reason },
      ip,
      userAgent,
    });

  const user = isEmail
    ? await prisma.adminUser.findUnique({ where: { email: identifier.toLowerCase() } })
    : isValidIraqiPhone(identifier)
      ? await prisma.adminUser.findUnique({ where: { phone: normalizeIraqiPhone(identifier) } })
      : null;

  // Constant-time-ish behaviour: do a dummy verify if user is missing, so
  // attackers can't trivially time the response to enumerate emails/phones.
  if (!user) {
    await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAA==");
    await auditFailure("UNKNOWN_USER");
    return jsonError(401, "INVALID_CREDENTIALS");
  }

  if (!user.active) {
    await auditFailure("ACCOUNT_DISABLED", user.id);
    return jsonError(403, "ACCOUNT_DISABLED");
  }
  if (isUserLocked(user)) {
    await auditFailure("ACCOUNT_LOCKED", user.id);
    return jsonError(429, "ACCOUNT_LOCKED", { until: user.lockedUntil });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await recordFailedLogin(user.id);
    await auditFailure("INVALID_CREDENTIALS", user.id);
    return jsonError(401, "INVALID_CREDENTIALS");
  }

  if (!isRole(user.role)) {
    await auditFailure("BAD_ROLE_IN_DB", user.id);
    return jsonError(500, "BAD_ROLE_IN_DB");
  }

  await clearFailedLogins(user.id);

  const { token, sessionId } = await createSession({
    userId: user.id,
    userAgent: req.headers.get("user-agent"),
    ip,
  });

  await logAdminAction({
    action: "auth.login",
    entity: "auth",
    entityId: user.id,
    after: { method: isEmail ? "email" : "phone" },
    actor: {
      kind: "dashboard",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        sessionId,
      },
    },
    ip,
    userAgent,
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
