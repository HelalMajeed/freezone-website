import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ rows: [], err: false });
  }
  try {
    const rows = await prisma.auditLog.findMany({
      orderBy: { id: "desc" },
      take: 150,
    });
    return Response.json({ rows, err: false });
  } catch {
    return Response.json({ rows: [], err: true });
  }
}
