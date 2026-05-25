import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { loadCategoryAttributeSchema } from "@/lib/classification/persist";
import { ensureCategorySchemaComplete } from "@/lib/classification/ensure-category-schema";
import { categoryAttributeRowsToFacetDefs, syncCategoryAttributesFromFacetKeys } from "@/lib/classification/sync";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const readGuard = await guardAdminRead(req);
  if (!readGuard.ok) return readGuard.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const { id: idRaw } = await ctx.params;
  const categoryId = parseInt(idRaw, 10);
  if (!Number.isFinite(categoryId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  try {
    const cat = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, slug: true, facetKeys: true },
    });
    if (!cat) return Response.json({ error: "not found" }, { status: 404 });

    let rows = await loadCategoryAttributeSchema(
      (args) => prisma.categoryAttribute.findMany(args),
      categoryId,
    );
    if (!rows.length && cat.facetKeys) {
      rows = await syncCategoryAttributesFromFacetKeys(prisma, categoryId, cat.facetKeys);
    }
    rows = await ensureCategorySchemaComplete(prisma, categoryId, cat.slug, rows);
    const categoryAttributes = categoryAttributeRowsToFacetDefs(rows);
    return Response.json({ categoryId, slug: cat.slug, categoryAttributes });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
