import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { requireAdminRead } from "@/lib/admin-auth";
import { jsonOk } from "@/lib/dashboard-guard";

export async function GET(req: Request) {
  const auth = await requireAdminRead(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return jsonOk({ items: [], rows: [], nextCursor: null });
  }
  try {
    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "150", 10) || 150));
    const rows = await prisma.auditLog.findMany({
      orderBy: { id: "desc" },
      take: limit,
    });
    return jsonOk({ items: rows, rows, nextCursor: null });
  } catch {
    return Response.json({ ok: false, error: "تعذّر تحميل سجل النشاط", code: "AUDIT_LOAD_FAILED" }, { status: 500 });
  }
}
