import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate } from "@/lib/admin-route-guard";
import { actorForAudit } from "@/lib/admin-auth";
import { jsonError } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

const MAX_NOTE_LENGTH = 2000;

/**
 * POST /api/admin/orders/:id/notes — append an internal staff note to the order
 * timeline (contract (b)). Notes are OrderStatusEvent rows with kind "note" and
 * are never exposed on any public endpoint.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdminMutate(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return jsonError(400, "VALIDATION");

  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_NOTE_LENGTH) {
    return jsonError(400, "VALIDATION");
  }

  const audit = auditContext(g.actor, req);
  const actor = actorForAudit(g.actor);

  try {
    const order = await prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!order) return jsonError(404, "NOT_FOUND");

    const event = await prisma.orderStatusEvent.create({
      data: {
        orderId: id,
        kind: "note",
        note: text,
        userId: actor.userId,
        userEmail: actor.userEmail,
      },
    });

    await logAdminAction("order.note", "Order", {
      entityId: id,
      payload: { noteId: event.id },
      ...audit,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          id: event.id,
          kind: event.kind,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          note: event.note,
          userId: event.userId,
          userEmail: event.userEmail,
          createdAt: event.createdAt.toISOString(),
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return handleRouteDbError(e);
  }
}
