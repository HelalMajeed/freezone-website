import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

const ALLOWED_STATUS = new Set([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  try {
    const rows = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { items: true },
    });
    return Response.json(rows);
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function PATCH(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { id?: number; status?: string } | null;
  const id = body?.id;
  const status = body?.status;
  if (typeof id !== "number" || !status || !ALLOWED_STATUS.has(status)) {
    return Response.json({ error: "id and valid status required" }, { status: 400 });
  }

  try {
    await prisma.order.update({
      where: { id },
      data: { status },
    });
    await logAdminAction("order.status", "Order", { entityId: id, payload: { status } });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
