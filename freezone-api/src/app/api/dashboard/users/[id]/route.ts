import { prisma } from "@/lib/prisma";
import { hashPassword, isRole, revokeAllUserSessions } from "@/lib/dashboard-auth";
import { requireSuperAdminRead, requireSuperAdminMutate } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/dashboard-guard";

type Ctx = { params: Promise<{ id: string }> };

async function readId(ctx: Ctx): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number.parseInt(id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** GET /api/dashboard/users/:id */
export async function GET(req: Request, ctx: Ctx): Promise<Response> {
  const g = await requireSuperAdminRead(req);
  if (!g.ok) return g.response;
  const id = await readId(ctx);
  if (id == null) return jsonError(400, "INVALID_ID");

  const user = await prisma.adminUser.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      avatarUrl: true,
      lastLoginAt: true,
      lockedUntil: true,
      failedLogins: true,
      createdAt: true,
      updatedAt: true,
      sessions: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, userAgent: true, ip: true, lastSeenAt: true, createdAt: true },
        orderBy: { lastSeenAt: "desc" },
        take: 10,
      },
    },
  });
  if (!user) return jsonError(404, "USER_NOT_FOUND");
  return jsonOk({ user });
}

/**
 * PATCH /api/dashboard/users/:id
 * Body: partial { name?, role?, active?, avatarUrl?, password? }
 * Setting password rotates all sessions for the target user.
 */
export async function PATCH(req: Request, ctx: Ctx): Promise<Response> {
  const g = await requireSuperAdminMutate(req);
  if (!g.ok) return g.response;
  const id = await readId(ctx);
  if (id == null) return jsonError(400, "INVALID_ID");

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    role?: string;
    active?: boolean;
    avatarUrl?: string | null;
    password?: string;
    unlock?: boolean;
  };

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.avatarUrl === "string" || body.avatarUrl === null) data.avatarUrl = body.avatarUrl;
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.role === "string") {
    if (!isRole(body.role)) return jsonError(400, "INVALID_ROLE");
    // Prevent demoting the only remaining superadmin
    if (body.role !== "SUPER_ADMIN") {
      const current = await prisma.adminUser.findUnique({ where: { id }, select: { role: true } });
      if (current?.role === "SUPER_ADMIN") {
        const superCount = await prisma.adminUser.count({ where: { role: "SUPER_ADMIN", active: true } });
        if (superCount <= 1) return jsonError(409, "LAST_SUPERADMIN");
      }
    }
    data.role = body.role;
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) return jsonError(400, "PASSWORD_TOO_SHORT");
    data.passwordHash = await hashPassword(body.password);
  }
  if (body.unlock === true) {
    data.lockedUntil = null;
    data.failedLogins = 0;
  }

  if (Object.keys(data).length === 0) return jsonError(400, "NOTHING_TO_UPDATE");

  const updated = await prisma.adminUser.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      avatarUrl: true,
      lockedUntil: true,
    },
  });

  // If password was reset OR account deactivated → kill all sessions for that user
  if (data.passwordHash || data.active === false) {
    await revokeAllUserSessions(id);
  }

  const actorId = g.actor.kind === "dashboard" ? g.actor.user.id : null;
  await prisma.auditLog.create({
    data: {
      action: "dashboard.user.update",
      entity: "AdminUser",
      entityId: String(id),
      userId: actorId,
      payload: {
        by: actorId,
        changedFields: Object.keys(data).filter((k) => k !== "passwordHash"),
        passwordRotated: !!data.passwordHash,
      },
    },
  });

  return jsonOk({ user: updated });
}

/**
 * DELETE /api/dashboard/users/:id
 * Hard-deletes a dashboard user (cascade removes their sessions).
 * Refuses to delete the last active superadmin or yourself.
 */
export async function DELETE(req: Request, ctx: Ctx): Promise<Response> {
  const g = await requireSuperAdminMutate(req);
  if (!g.ok) return g.response;
  const id = await readId(ctx);
  if (id == null) return jsonError(400, "INVALID_ID");
  if (g.actor.kind === "dashboard" && id === g.actor.user.id) return jsonError(409, "CANT_DELETE_SELF");

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { role: true, email: true } });
  if (!target) return jsonError(404, "USER_NOT_FOUND");

  if (target.role === "SUPER_ADMIN") {
    const superCount = await prisma.adminUser.count({ where: { role: "SUPER_ADMIN", active: true } });
    if (superCount <= 1) return jsonError(409, "LAST_SUPERADMIN");
  }

  await prisma.adminUser.delete({ where: { id } });
  const actorId = g.actor.kind === "dashboard" ? g.actor.user.id : null;
  await prisma.auditLog.create({
    data: {
      action: "dashboard.user.delete",
      entity: "AdminUser",
      entityId: String(id),
      userId: actorId,
      payload: { by: actorId, email: target.email },
    },
  });
  return jsonOk({ deleted: true });
}
