import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";

export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: true, data: { items: [] } });
  }
  const limit = Math.min(50, Math.max(5, parseInt(new URL(req.url).searchParams.get("limit") ?? "20", 10) || 20));

  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      userEmail: true,
      createdAt: true,
      payload: true,
    },
  });

  return Response.json({
    ok: true,
    data: {
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        userEmail: r.userEmail,
        createdAt: r.createdAt.toISOString(),
        summary: formatAuditSummary(r.action, r.entity, r.entityId),
      })),
    },
  });
}

function formatAuditSummary(action: string, entity: string, entityId: string | null): string {
  const id = entityId ? ` #${entityId}` : "";
  return `${action} — ${entity}${id}`;
}
