import { getCurrentDashboardUser } from "@/lib/dashboard-auth";
import { jsonError, jsonOk } from "@/lib/dashboard-guard";

/**
 * GET /api/dashboard/auth/me
 * Returns the currently logged-in user, or 401 if no valid session.
 */
export async function GET(req: Request): Promise<Response> {
  const user = await getCurrentDashboardUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  return jsonOk({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
  });
}
