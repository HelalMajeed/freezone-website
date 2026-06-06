import type { AdminRole } from "@prisma/client";
import { getCurrentDashboardUser, type CurrentUser } from "./dashboard-auth";
import { isAdminDirectLoginEnabled } from "./admin-direct-login";
import { isAdminAuthenticatedFromRequest, isLegacyAdminCookieEnabled } from "./admin-session";
import { internalActorFromRequest } from "./internal-actor";
import { clientIpFromRequest, clientUserAgentFromRequest } from "./dashboard-guard";

export type { AdminRole };

const ROLE_RANK: Record<AdminRole, number> = {
  CATALOG_EDITOR: 0,
  CATALOG_MANAGER: 1,
  SUPER_ADMIN: 2,
};

export function adminRoleAtLeast(role: AdminRole, minRole: AdminRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export type AdminActor =
  | { kind: "dashboard"; user: CurrentUser }
  | { kind: "legacy"; role: "SUPER_ADMIN"; email: "legacy@admin" }
  /** In-process loop-back caller (importer) — see src/lib/internal-actor.ts. */
  | { kind: "system"; role: "SUPER_ADMIN"; email: string };

export type AdminAuthResult =
  | { ok: true; actor: AdminActor }
  | { ok: false; response: Response };

/** Legacy `fz_admin_session` cookie — only honored behind LEGACY_ADMIN_COOKIE=true. */
function legacyCookieAccepted(req: Request): boolean {
  return isLegacyAdminCookieEnabled() && isAdminAuthenticatedFromRequest(req);
}

export async function getAdminActorFromRequest(req: Request): Promise<AdminActor | null> {
  const internal = internalActorFromRequest(req);
  if (internal) return { kind: "system", role: "SUPER_ADMIN", email: internal };
  const user = await getCurrentDashboardUser(req);
  if (user) return { kind: "dashboard", user };
  if (legacyCookieAccepted(req)) {
    return { kind: "legacy", role: "SUPER_ADMIN", email: "legacy@admin" };
  }
  return null;
}

/** Read-only admin routes (lists, GET by id). */
export async function requireAdminRead(req: Request): Promise<AdminAuthResult> {
  const actor = await getAdminActorFromRequest(req);
  if (!actor) {
    return { ok: false, response: jsonAdminError(401, "يجب تسجيل الدخول", "UNAUTHENTICATED") };
  }
  return { ok: true, actor };
}

/** Team management — dashboard SUPER_ADMIN or legacy direct-login session. */
export async function requireSuperAdminRead(req: Request): Promise<AdminAuthResult> {
  const read = await requireAdminRead(req);
  if (!read.ok) return read;
  if (read.actor.kind === "legacy" || read.actor.kind === "system") return read;
  if (read.actor.user.role !== "SUPER_ADMIN") {
    return { ok: false, response: jsonAdminError(403, "صلاحية مدير عام مطلوبة", "FORBIDDEN") };
  }
  return read;
}

/**
 * Mutating admin routes — requires dashboard session with one of `roles`.
 * Legacy cookie alone is not sufficient for CUD (data-entry accountability).
 */
export async function requireAdminRole(
  req: Request,
  roles: AdminRole[],
): Promise<AdminAuthResult> {
  const internal = internalActorFromRequest(req);
  if (internal) {
    return { ok: true, actor: { kind: "system", role: "SUPER_ADMIN", email: internal } };
  }
  const user = await getCurrentDashboardUser(req);
  if (!user) {
    if (legacyCookieAccepted(req)) {
      if (isAdminDirectLoginEnabled()) {
        return { ok: true, actor: { kind: "legacy", role: "SUPER_ADMIN", email: "legacy@admin" } };
      }
      return {
        ok: false,
        response: jsonAdminError(
          403,
          "استخدم تسجيل الدخول من لوحة المشغّلين (/dashboard/login) لإجراء التعديلات",
          "LEGACY_SESSION_READ_ONLY",
        ),
      };
    }
    return { ok: false, response: jsonAdminError(401, "يجب تسجيل الدخول", "UNAUTHENTICATED") };
  }
  if (!roles.includes(user.role)) {
    return { ok: false, response: jsonAdminError(403, "ليس لديك صلاحية لهذا الإجراء", "FORBIDDEN") };
  }
  return { ok: true, actor: { kind: "dashboard", user } };
}

export function actorForAudit(actor: AdminActor): { userId: number | null; userEmail: string | null } {
  if (actor.kind === "dashboard") {
    return { userId: actor.user.id, userEmail: actor.user.email };
  }
  return { userId: null, userEmail: actor.email };
}

export function clientIp(req: Request): string | null {
  return clientIpFromRequest(req);
}

export function clientUserAgent(req: Request): string | null {
  return clientUserAgentFromRequest(req);
}

function jsonAdminError(status: number, message: string, code: string): Response {
  return Response.json({ ok: false, error: message, code }, { status });
}
