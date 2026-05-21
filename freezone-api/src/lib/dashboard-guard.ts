import { getCurrentDashboardUser, type CurrentUser, type Role, roleAtLeast } from "./dashboard-auth";

export type GuardResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; response: Response };

/**
 * Authorize a dashboard route. If `minRole` is provided, also enforce role floor.
 *
 *   const g = await guardDashboard(req, "admin");
 *   if (!g.ok) return g.response;
 *   const user = g.user;
 */
export async function guardDashboard(req: Request, minRole?: Role): Promise<GuardResult> {
  const user = await getCurrentDashboardUser(req);
  if (!user) return { ok: false, response: jsonError(401, "UNAUTHENTICATED") };
  if (minRole && !roleAtLeast(user.role, minRole)) {
    return { ok: false, response: jsonError(403, "FORBIDDEN") };
  }
  return { ok: true, user };
}

export function jsonError(status: number, code: string, extra?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: false, error: code, ...(extra ?? {}) }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonOk(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

/** Best-effort client IP from forwarded headers (the API sits behind Fly/Netlify). */
export function clientIpFromRequest(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
