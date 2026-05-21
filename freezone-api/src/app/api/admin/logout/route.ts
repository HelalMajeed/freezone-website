import { jsonClearSessionCookie } from "@/lib/admin-session";
import { getCurrentDashboardUser, revokeSession } from "@/lib/dashboard-auth";

export async function POST(req: Request) {
  const user = await getCurrentDashboardUser(req);
  if (user) {
    await revokeSession(user.sessionId);
  }
  const res = jsonClearSessionCookie({ ok: true });
  const ss =
    process.env.DASHBOARD_COOKIE_SAMESITE?.trim().toLowerCase() === "none"
      ? "None"
      : process.env.DASHBOARD_COOKIE_SAMESITE?.trim().toLowerCase() === "strict"
        ? "Strict"
        : "Lax";
  const secure = process.env.NODE_ENV === "production" || ss === "None";
  const dashParts = ["fz_dashboard_session=", "Path=/", "HttpOnly", `SameSite=${ss}`, "Max-Age=0"];
  if (secure) dashParts.push("Secure");
  res.headers.append("Set-Cookie", dashParts.join("; "));
  return res;
}
