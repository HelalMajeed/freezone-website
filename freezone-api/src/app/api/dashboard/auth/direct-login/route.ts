import { prisma } from "@/lib/prisma";
import { isAdminDirectLoginEnabled } from "@/lib/admin-direct-login";
import {
  createSession,
  isRole,
  jsonWithDashboardCookie,
} from "@/lib/dashboard-auth";
import { clientIpFromRequest, jsonError } from "@/lib/dashboard-guard";
import { signAdminSession } from "@/lib/admin-session";

/**
 * POST /api/dashboard/auth/direct-login
 * No body. Only when ADMIN_SKIP_AUTH or ADMIN_DIRECT_LOGIN is set.
 */
export async function POST(req: Request): Promise<Response> {
  if (!isAdminDirectLoginEnabled()) {
    return jsonError(403, "DIRECT_LOGIN_DISABLED");
  }

  const user =
    (await prisma.adminUser.findFirst({
      where: { active: true, role: "SUPER_ADMIN" },
      orderBy: { id: "asc" },
    })) ??
    (await prisma.adminUser.findFirst({
      where: { active: true },
      orderBy: { id: "asc" },
    }));

  if (!user || !isRole(user.role)) {
    const legacyToken = signAdminSession();
    const headers = new Headers({ "Content-Type": "application/json" });
    const ss =
      process.env.ADMIN_SESSION_SAMESITE?.trim().toLowerCase() === "none"
        ? "None"
        : process.env.ADMIN_SESSION_SAMESITE?.trim().toLowerCase() === "strict"
          ? "Strict"
          : "Lax";
    const secure = process.env.NODE_ENV === "production" || ss === "None";
    const legacyParts = [
      `fz_admin_session=${encodeURIComponent(legacyToken)}`,
      "Path=/",
      "HttpOnly",
      `SameSite=${ss}`,
      `Max-Age=${7 * 24 * 60 * 60}`,
    ];
    if (secure) legacyParts.push("Secure");
    headers.append("Set-Cookie", legacyParts.join("; "));
    return new Response(
      JSON.stringify({
        ok: true,
        mode: "legacy",
        user: {
          id: 0,
          email: "legacy@admin",
          name: "مسؤول — دخول مباشر",
          role: "SUPER_ADMIN",
          avatarUrl: null,
        },
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

  const legacyToken = signAdminSession();
  const ss =
    process.env.ADMIN_SESSION_SAMESITE?.trim().toLowerCase() === "none"
      ? "None"
      : process.env.ADMIN_SESSION_SAMESITE?.trim().toLowerCase() === "strict"
        ? "Strict"
        : "Lax";
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
