import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

export async function logAdminAction(
  action: string,
  entity: string,
  opts?: { entityId?: string | number | null; payload?: unknown },
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    const data: Prisma.AuditLogCreateInput = {
      action,
      entity,
      entityId:
        opts?.entityId === undefined || opts?.entityId === null
          ? null
          : String(opts.entityId),
    };
    if (opts?.payload !== undefined) {
      data.payload = opts.payload as Prisma.InputJsonValue;
    }
    await prisma.auditLog.create({ data });
  } catch {
    // لا نعطل العملية الرئيسية إذا فشل السجل
  }
}
