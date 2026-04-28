import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function PUT(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { orderedIds?: number[] } | null;
  const ids = body?.orderedIds;
  if (!Array.isArray(ids) || !ids.length) {
    return Response.json({ error: "orderedIds required" }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      ids.map((id, i) =>
        prisma.cmsPageSection.update({
          where: { id },
          data: { sortOrder: i },
        }),
      ),
    );
    await logAdminAction("cmsSection.reorder", "CmsPageSection", { payload: { count: ids.length } });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
