import type { AdminRole } from "@prisma/client";
import {
  requireAdminRead,
  requireAdminRole,
  type AdminActor,
  clientIp,
  clientUserAgent,
} from "./admin-auth";

const MUTATE_ROLES: AdminRole[] = ["CATALOG_EDITOR", "CATALOG_MANAGER", "SUPER_ADMIN"];

export type AdminGuardOk = { ok: true; actor: AdminActor };
export type AdminGuardFail = { ok: false; response: Response };

export async function guardAdminRead(req: Request): Promise<AdminGuardOk | AdminGuardFail> {
  const g = await requireAdminRead(req);
  if (!g.ok) return { ok: false, response: g.response };
  return { ok: true, actor: g.actor };
}

export async function guardAdminMutate(
  req: Request,
  roles: AdminRole[] = MUTATE_ROLES,
): Promise<AdminGuardOk | AdminGuardFail> {
  const g = await requireAdminRole(req, roles);
  if (!g.ok) return { ok: false, response: g.response };
  return { ok: true, actor: g.actor };
}

export function auditContext(actor: AdminActor, req: Request) {
  return {
    actor,
    ip: clientIp(req),
    userAgent: clientUserAgent(req),
  };
}
