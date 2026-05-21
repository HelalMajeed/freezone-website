import { prisma } from "@/lib/prisma";
import { hashPassword, revokeAllUserSessions, verifyPassword } from "@/lib/dashboard-auth";
import { guardDashboard, jsonError, jsonOk } from "@/lib/dashboard-guard";

/**
 * POST /api/dashboard/auth/change-password
 * Body: { currentPassword, newPassword }
 * Any authenticated user can change their own password. Revokes all other
 * sessions on success.
 */
export async function POST(req: Request): Promise<Response> {
  const g = await guardDashboard(req);
  if (!g.ok) return g.response;

  const body = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };
  const current = body.currentPassword ?? "";
  const next = body.newPassword ?? "";
  if (!current || !next) return jsonError(400, "MISSING_FIELDS");
  if (next.length < 8) return jsonError(400, "PASSWORD_TOO_SHORT");

  const user = await prisma.adminUser.findUnique({ where: { id: g.user.id } });
  if (!user) return jsonError(404, "USER_NOT_FOUND");

  if (!(await verifyPassword(current, user.passwordHash))) {
    return jsonError(401, "INVALID_CURRENT_PASSWORD");
  }

  const newHash = await hashPassword(next);
  await prisma.adminUser.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  // Kill all other sessions (the current one is also revoked → user must log in again)
  await revokeAllUserSessions(user.id);

  return jsonOk({ rotated: true });
}
