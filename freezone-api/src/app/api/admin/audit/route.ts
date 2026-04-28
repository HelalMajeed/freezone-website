import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { handleRouteDbError } from "@/lib/db-route-error";

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ rows: [], total: 0 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));
  try {
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { id: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count(),
    ]);
    return Response.json({ rows, total, limit, offset });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
