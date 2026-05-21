import { getCurrentDashboardUser, jsonClearDashboardCookie, revokeSession } from "@/lib/dashboard-auth";

/**
 * POST /api/dashboard/auth/logout
 * Revokes the current session and clears both dashboard + legacy cookies.
 */
export async function POST(req: Request): Promise<Response> {
  const user = await getCurrentDashboardUser(req);
  if (user) {
    await revokeSession(user.sessionId);
  }
  const res = jsonClearDashboardCookie({ ok: true });
  // Also clear legacy admin cookie
  const parts = ["fz_admin_session=", "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.headers.append("Set-Cookie", parts.join("; "));
  return res;
}
