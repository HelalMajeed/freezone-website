import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminMutate, auditContext } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function PUT(req: Request) {
  const auth = await guardAdminMutate(req);
  if (!auth.ok) return auth.response;
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
    await logAdminAction("cmsSection.reorder", "CmsPageSection", { ...auditContext(auth.actor, req), payload: { count: ids.length } });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
