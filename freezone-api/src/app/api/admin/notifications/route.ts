import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { ACTIVE_PRODUCT_WHERE } from "@/lib/admin-product-scope";
import { getCurrentDashboardUser } from "@/lib/dashboard-auth";

export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: true, data: { pendingReview: 0, newComments: 0, categoriesNoAttrs: 0 } });
  }

  const user = await getCurrentDashboardUser(req);
  const role = user?.role ?? "SUPER_ADMIN";
  const isManager = role === "CATALOG_MANAGER" || role === "SUPER_ADMIN";

  const [pendingReview, categoriesNoAttrs] = await Promise.all([
    isManager
      ? prisma.product.count({
          where: { ...ACTIVE_PRODUCT_WHERE, catalogStatus: "PENDING_REVIEW" },
        })
      : Promise.resolve(0),
    isManager ? countCategoriesWithoutAttributes() : Promise.resolve(0),
  ]);

  let newComments = 0;
  if (user) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (isManager) {
      newComments = await prisma.productComment.count({
        where: {
          createdAt: { gte: since },
          user: { role: "CATALOG_EDITOR" },
          product: { catalogStatus: { in: ["CHANGES_REQUESTED", "PENDING_REVIEW", "DRAFT"] } },
        },
      });
    } else {
      const myProducts = await prisma.product.findMany({
        where: { createdById: user.id, ...ACTIVE_PRODUCT_WHERE },
        select: { id: true },
      });
      const ids = myProducts.map((p) => p.id);
      if (ids.length) {
        newComments = await prisma.productComment.count({
          where: {
            productId: { in: ids },
            createdAt: { gte: since },
            user: { role: { in: ["CATALOG_MANAGER", "SUPER_ADMIN"] } },
            NOT: { userId: user.id },
          },
        });
      }
    }
  }

  return Response.json({
    ok: true,
    data: {
      pendingReview,
      newComments,
      categoriesNoAttrs,
      role,
    },
  });
}

async function countCategoriesWithoutAttributes(): Promise<number> {
  const cats = await prisma.category.findMany({
    where: { active: true },
    select: { id: true, _count: { select: { categoryAttributes: true } } },
  });
  return cats.filter((c) => c._count.categoryAttributes === 0).length;
}
