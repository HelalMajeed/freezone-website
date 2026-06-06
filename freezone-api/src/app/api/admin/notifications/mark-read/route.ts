import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminMutate } from "@/lib/admin-route-guard";
import { jsonError, jsonOk } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";

const MAX_IDS = 200;

/**
 * POST /api/admin/notifications/mark-read — contract (e).
 *
 * Body is exactly one of `{ "ids": [71, 72] }` or `{ "all": true }`.
 * Sets `readAt = now()` on the matching **visible, unread** rows.
 * Response: `{ ok: true, data: { updated: <n> } }`.
 */
export async function POST(req: Request): Promise<Response> {
  const g = await guardAdminMutate(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const body = (await req.json().catch(() => null)) as
    | { ids?: unknown; all?: unknown }
    | null;
  if (!body) return jsonError(400, "VALIDATION");

  const hasIds = body.ids !== undefined;
  const hasAll = body.all !== undefined;
  if (hasIds === hasAll) return jsonError(400, "VALIDATION"); // neither or both

  let ids: number[] | null = null;
  if (hasIds) {
    if (!Array.isArray(body.ids)) return jsonError(400, "VALIDATION");
    ids = Array.from(
      new Set(
        body.ids.filter(
          (n): n is number => typeof n === "number" && Number.isInteger(n) && n > 0,
        ),
      ),
    );
    if (ids.length === 0 || ids.length > MAX_IDS) return jsonError(400, "VALIDATION");
  } else if (body.all !== true) {
    return jsonError(400, "VALIDATION");
  }

  const user = g.actor.kind === "dashboard" ? g.actor.user : null;
  const visibility: Prisma.NotificationWhereInput = user
    ? { OR: [{ recipientId: null }, { recipientId: user.id }] }
    : { recipientId: null };

  try {
    const result = await prisma.notification.updateMany({
      where: {
        AND: [visibility, { readAt: null }, ...(ids ? [{ id: { in: ids } }] : [])],
      },
      data: { readAt: new Date() },
    });
    return jsonOk({ updated: result.count });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
