import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { defaultDraftPayload } from "@/lib/cms-section-defaults";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

async function ensurePage(slug: string) {
  return prisma.cmsPage.upsert({
    where: { slug },
    create: { slug, labelAr: "الصفحة الرئيسية", labelEn: "Homepage" },
    update: {},
  });
}

export async function POST(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as
    | { pageSlug?: string; type?: string; duplicateSectionId?: number }
    | null;

  try {
    if (body?.duplicateSectionId != null) {
      const src = await prisma.cmsPageSection.findUnique({
        where: { id: body.duplicateSectionId },
      });
      if (!src) return Response.json({ error: "not found" }, { status: 404 });
      const maxSort = await prisma.cmsPageSection.aggregate({
        where: { pageId: src.pageId },
        _max: { sortOrder: true },
      });
      const row = await prisma.cmsPageSection.create({
        data: {
          pageId: src.pageId,
          type: src.type,
          sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
          visible: src.visible,
          draftPayload: src.draftPayload as Prisma.InputJsonValue,
        },
      });
      await logAdminAction("cmsSection.duplicate", "CmsPageSection", { entityId: row.id });
      return Response.json(row);
    }

    const pageSlug = body?.pageSlug ?? "home";
    const type = body?.type?.trim();
    if (!type) return Response.json({ error: "type required" }, { status: 400 });

    const page = await ensurePage(pageSlug);
    const maxSort = await prisma.cmsPageSection.aggregate({
      where: { pageId: page.id },
      _max: { sortOrder: true },
    });
    const draft = defaultDraftPayload(type);
    const row = await prisma.cmsPageSection.create({
      data: {
        pageId: page.id,
        type,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        draftPayload: draft as Prisma.InputJsonValue,
        visible: true,
      },
    });
    await logAdminAction("cmsSection.create", "CmsPageSection", { entityId: row.id, payload: { type } });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
