import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { syncCategoryAttributesFromFacetKeys } from "@/lib/classification/sync";
import { getCategoryTemplate } from "@/data/category-templates";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const mutate = await guardAdminMutate(req, ["CATALOG_MANAGER", "SUPER_ADMIN"]);
  if (!mutate.ok) return mutate.response;
  const audit = auditContext(mutate.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "لا توجد قاعدة بيانات" }, { status: 503 });
  }

  const categoryId = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(categoryId)) {
    return Response.json({ ok: false, error: "معرّف غير صالح" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { templateId?: string } | null;
  const template = body?.templateId ? getCategoryTemplate(body.templateId) : undefined;
  if (!template) {
    return Response.json({ ok: false, error: "قالب غير معروف", code: "UNKNOWN_TEMPLATE" }, { status: 400 });
  }

  try {
    const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true, slug: true } });
    if (!cat) return Response.json({ ok: false, error: "القسم غير موجود" }, { status: 404 });

    const rows = await syncCategoryAttributesFromFacetKeys(prisma, categoryId, template.attributes);
    await logAdminAction("category.apply_template", "Category", {
      entityId: categoryId,
      payload: { templateId: template.id, attributeCount: rows.length },
      ...audit,
    });
    return Response.json({
      ok: true,
      data: { templateId: template.id, attributeCount: rows.length, categoryAttributes: rows.length },
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
