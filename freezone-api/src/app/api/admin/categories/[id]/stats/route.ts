import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { ACTIVE_PRODUCT_WHERE } from "@/lib/admin-product-scope";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "NO_DATABASE" }, { status: 503 });
  }
  const categoryId = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(categoryId)) {
    return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  const cat = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, nameAr: true, nameEn: true, slug: true },
  });
  if (!cat) return Response.json({ ok: false, error: "not found" }, { status: 404 });

  const baseWhere = { categoryId, ...ACTIVE_PRODUCT_WHERE };
  const [active, draft, archived, avg, attrCount, products] = await Promise.all([
    prisma.product.count({ where: { ...baseWhere, catalogStatus: "PUBLISHED" } }),
    prisma.product.count({ where: { ...baseWhere, catalogStatus: "DRAFT" } }),
    prisma.product.count({ where: { categoryId, deletedAt: { not: null } } }),
    prisma.product.aggregate({ where: baseWhere, _avg: { price: true } }),
    prisma.categoryAttribute.count({ where: { categoryId } }),
    prisma.product.findMany({
      where: baseWhere,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
  ]);

  const timeline: Record<string, number> = {};
  for (const p of products) {
    const key = p.createdAt.toISOString().slice(0, 7);
    timeline[key] = (timeline[key] ?? 0) + 1;
  }

  return Response.json({
    ok: true,
    data: {
      category: cat,
      counts: { active, draft, archived, total: active + draft },
      avgPrice: Math.round(avg._avg.price ?? 0),
      attributeCount: attrCount,
      timeline: Object.entries(timeline).map(([month, count]) => ({ month, count })),
    },
  });
}
