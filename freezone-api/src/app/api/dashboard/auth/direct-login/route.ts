import { prisma } from "@/lib/prisma";
import { adminDirectLoginGate } from "@/lib/admin-direct-login";
import { createSession, isRole, jsonWithDashboardCookie } from "@/lib/dashboard-auth";
import { clientIpFromRequest, jsonError } from "@/lib/dashboard-guard";
import { signAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

/**
 * POST /api/dashboard/auth/direct-login
 *
 * Passwordless direct entry. No body, no key. When ADMIN_DIRECT_LOGIN (or
 * ADMIN_SKIP_AUTH) is enabled, issues a SUPER_ADMIN dashboard session; otherwise
 * returns 403.
 */
function noStore(res: Response): Response {
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function legacyAdminCookieParts(): string[] {
  const ss =
    process.env.ADMIN_SESSION_SAMESITE?.trim().toLowerCase() === "none"
      ? "None"
      : process.env.ADMIN_SESSION_SAMESITE?.trim().toLowerCase() === "strict"
        ? "Strict"
        : "Lax";
  const secure = process.env.NODE_ENV === "production" || ss === "None";
  const parts = [
    `fz_admin_session=${encodeURIComponent(signAdminSession())}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${ss}`,
    `Max-Age=${7 * 24 * 60 * 60}`,
  ];
  if (secure) parts.push("Secure");
  return parts;
}

export async function POST(req: Request): Promise<Response> {
  const gate = adminDirectLoginGate();
  if (!gate.ok) {
    return noStore(jsonError(403, gate.code));
  }

  const user =
    (await prisma.adminUser.findFirst({
      where: { active: true, role: "SUPER_ADMIN" },
      orderBy: { id: "asc" },
    })) ??
    (await prisma.adminUser.findFirst({ where: { active: true }, orderBy: { id: "asc" } }));

  // No usable admin row → fall back to a legacy HMAC-cookie session so the owner
  // is never locked out.
  if (!user || !isRole(user.role)) {
    const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
    headers.append("Set-Cookie", legacyAdminCookieParts().join("; "));
    await logAdminAction("auth.direct-login", "AdminUser", {
      entityId: 0,
      payload: { mode: "legacy" },
    });
    return new Response(
      JSON.stringify({
        ok: true,
        mode: "legacy",
        user: { id: 0, email: "legacy@admin", name: "Admin", role: "SUPER_ADMIN", avatarUrl: null },
      }),
      { status: 200, headers },
    );
  }

  const { token } = await createSession({
    userId: user.id,
    userAgent: req.headers.get("user-agent"),
    ip: clientIpFromRequest(req),
  });

  const res = jsonWithDashboardCookie(
    {
      ok: true,
      mode: "dashboard",
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
  res.headers.append("Set-Cookie", legacyAdminCookieParts().join("; "));

  await logAdminAction("auth.direct-login", "AdminUser", {
    entityId: user.id,
    payload: { mode: "dashboard", email: user.email },
  });

  return noStore(res);
}
