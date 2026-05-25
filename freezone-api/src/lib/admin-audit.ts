import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import type { AdminActor } from "@/lib/admin-auth";
import { actorForAudit } from "@/lib/admin-auth";

export type AuditLogInput = {
  action: string;
  entity: string;
  entityId?: string | number | null;
  before?: unknown;
  after?: unknown;
  actor?: AdminActor;
  ip?: string | null;
  userAgent?: string | null;
};

type LegacyOpts = {
  entityId?: string | number | null;
  payload?: unknown;
  actor?: AdminActor;
  ip?: string | null;
  userAgent?: string | null;
};

async function persistAuditLog(input: AuditLogInput): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    const auditActor = input.actor ? actorForAudit(input.actor) : { userId: null, userEmail: null };
    const payload: Record<string, unknown> = {};
    if (input.before !== undefined) payload.before = input.before;
    if (input.after !== undefined) payload.after = input.after;

    const data: Prisma.AuditLogCreateInput = {
      action: input.action,
      entity: input.entity,
      entityId:
        input.entityId === undefined || input.entityId === null ? null : String(input.entityId),
      userId: auditActor.userId,
      userEmail: auditActor.userEmail,
      ip: input.ip?.slice(0, 64) ?? null,
      userAgent: input.userAgent?.slice(0, 512) ?? null,
    };
    if (Object.keys(payload).length > 0) {
      data.payload = payload as Prisma.InputJsonValue;
    }
    await prisma.auditLog.create({ data });
  } catch (err) {
    console.error("[audit] failed to persist", err instanceof Error ? err.message : err);
  }
}

export async function logAdminAction(input: AuditLogInput): Promise<void>;
export async function logAdminAction(
  action: string,
  entity: string,
  opts?: LegacyOpts,
): Promise<void>;
export async function logAdminAction(
  actionOrInput: string | AuditLogInput,
  entity?: string,
  opts?: LegacyOpts,
): Promise<void> {
  if (typeof actionOrInput === "object") {
    await persistAuditLog(actionOrInput);
    return;
  }
  await persistAuditLog({
    action: actionOrInput,
    entity: entity ?? "Unknown",
    entityId: opts?.entityId,
    after: opts?.payload,
    actor: opts?.actor,
    ip: opts?.ip,
    userAgent: opts?.userAgent,
  });
}
