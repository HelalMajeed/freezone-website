import { prisma } from "@/lib/prisma";
import { hashPassword, isRole } from "@/lib/dashboard-auth";
import { requireSuperAdminRead } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/dashboard-guard";

/**
 * GET /api/dashboard/users
 * Superadmin: list all dashboard users.
 */
export async function GET(req: Request): Promise<Response> {
  const g = await requireSuperAdminRead(req);
  if (!g.ok) return g.response;

  const users = await prisma.adminUser.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      avatarUrl: true,
      lastLoginAt: true,
      lockedUntil: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { sessions: true } },
    },
  });
  return jsonOk({ users });
}

/**
 * POST /api/dashboard/users
 * Superadmin: create a new dashboard user.
 * Body: { email, name, password, role }
 */
export async function POST(req: Request): Promise<Response> {
  const g = await requireSuperAdminRead(req);
  if (!g.ok) return g.response;

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    password?: string;
    role?: string;
  };

  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const password = body.password ?? "";
  const role = body.role ?? "SUPER_ADMIN";

  if (!email || !email.includes("@")) return jsonError(400, "INVALID_EMAIL");
  if (!name) return jsonError(400, "MISSING_NAME");
  if (password.length < 8) return jsonError(400, "PASSWORD_TOO_SHORT");
  if (!isRole(role)) return jsonError(400, "INVALID_ROLE");

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return jsonError(409, "EMAIL_TAKEN");

  const passwordHash = await hashPassword(password);

  const created = await prisma.adminUser.create({
    data: { email, name, passwordHash, role, active: true },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  const actorId = g.actor.kind === "dashboard" ? g.actor.user.id : null;
  await prisma.auditLog.create({
    data: {
      action: "dashboard.user.create",
      entity: "AdminUser",
      entityId: String(created.id),
      userId: actorId,
      payload: { by: actorId, role: created.role },
    },
  });

  return jsonOk({ user: created }, { status: 201 });
}
