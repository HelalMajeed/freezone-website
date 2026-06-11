import { getCurrentDashboardUser, jsonClearDashboardCookie, revokeSession } from "@/lib/dashboard-auth";
import { clientIpFromRequest, clientUserAgentFromRequest } from "@/lib/dashboard-guard";
import { logAdminAction } from "@/lib/admin-audit";

/**
 * POST /api/dashboard/auth/logout
 * Revokes the current session and clears both dashboard + legacy cookies.
 * Audited as `auth.logout`.
 */
export async function POST(req: Request): Promise<Response> {
  const user = await getCurrentDashboardUser(req);
  if (user) {
    await revokeSession(user.sessionId);
    await logAdminAction({
      action: "auth.logout",
      entity: "auth",
      entityId: user.id,
      actor: { kind: "dashboard", user },
      ip: clientIpFromRequest(req),
      userAgent: clientUserAgentFromRequest(req),
    });
  }
  const res = jsonClearDashboardCookie({ ok: true });
  // Also clear legacy admin cookie
  const parts = ["fz_admin_session=", "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.headers.append("Set-Cookie", parts.join("; "));
  return res;
}
