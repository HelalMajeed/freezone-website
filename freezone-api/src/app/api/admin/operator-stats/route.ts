import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { getCurrentDashboardUser } from "@/lib/dashboard-auth";
import { ACTIVE_PRODUCT_WHERE } from "@/lib/admin-product-scope";

export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: true, data: { dbConnected: false } });
  }

  const user = await getCurrentDashboardUser(req);
  const role = user?.role ?? "SUPER_ADMIN";
  const isManager = role === "CATALOG_MANAGER" || role === "SUPER_ADMIN";
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const teamPendingReview = await prisma.product.count({
    where: { ...ACTIVE_PRODUCT_WHERE, catalogStatus: "PENDING_REVIEW" },
  });

  let myDrafts = 0;
  let myPendingReview = 0;
  let myChangesRequested = 0;
  let productsCreatedToday = 0;

  if (user) {
    const mine = { createdById: user.id, ...ACTIVE_PRODUCT_WHERE };
    [myDrafts, myPendingReview, myChangesRequested, productsCreatedToday] = await Promise.all([
      prisma.product.count({ where: { ...mine, catalogStatus: "DRAFT" } }),
      prisma.product.count({ where: { ...mine, catalogStatus: "PENDING_REVIEW" } }),
      prisma.product.count({ where: { ...mine, catalogStatus: "CHANGES_REQUESTED" } }),
      prisma.product.count({ where: { createdById: user.id, createdAt: { gte: startOfDay } } }),
    ]);
  }

  const categoriesWithoutAttrs = await prisma.category.count({
    where: {
      active: true,
      categoryAttributes: { none: {} },
    },
  });

  return Response.json({
    ok: true,
    data: {
      role,
      isManager,
      teamPendingReview: isManager ? teamPendingReview : 0,
      myDrafts,
      myPendingReview,
      myChangesRequested,
      productsCreatedToday,
      categoriesWithoutAttrs: isManager ? categoriesWithoutAttrs : 0,
    },
  });
}
