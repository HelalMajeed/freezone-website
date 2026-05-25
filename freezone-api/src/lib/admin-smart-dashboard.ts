import { prisma } from "@/lib/prisma";
import { ACTIVE_PRODUCT_WHERE } from "@/lib/admin-product-scope";
import type { AdminRole } from "@prisma/client";

function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function buildSmartDashboard(userId: number | null, role: AdminRole) {
  const isManager = role === "CATALOG_MANAGER" || role === "SUPER_ADMIN";
  const weekStart = startOfWeek();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const mineWhere = userId != null ? { createdById: userId, ...ACTIVE_PRODUCT_WHERE } : ACTIVE_PRODUCT_WHERE;

  const [
    publishedThisWeek,
    myPendingReview,
    myDrafts,
    myChangesRequested,
    unreadCommentsForMe,
    recentMine,
    sparklineProducts,
  ] = await Promise.all([
    userId != null
      ? prisma.product.count({
          where: {
            ...mineWhere,
            catalogStatus: "PUBLISHED",
            updatedAt: { gte: weekStart },
          },
        })
      : Promise.resolve(0),
    userId != null
      ? prisma.product.count({ where: { ...mineWhere, catalogStatus: "PENDING_REVIEW" } })
      : Promise.resolve(0),
    userId != null
      ? prisma.product.count({ where: { ...mineWhere, catalogStatus: "DRAFT" } })
      : Promise.resolve(0),
    userId != null
      ? prisma.product.count({ where: { ...mineWhere, catalogStatus: "CHANGES_REQUESTED" } })
      : Promise.resolve(0),
    userId != null
      ? prisma.productComment.count({
          where: {
            createdAt: { gte: sevenDaysAgo },
            product: userId ? { createdById: userId } : undefined,
            user: { role: { in: ["CATALOG_MANAGER", "SUPER_ADMIN"] } },
            NOT: { userId },
          },
        })
      : Promise.resolve(0),
    userId != null
      ? prisma.product.findMany({
          where: { createdById: userId },
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            catalogStatus: true,
            updatedAt: true,
            images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
          },
        })
      : Promise.resolve([]),
    userId != null
      ? prisma.product.findMany({
          where: {
            createdById: userId,
            catalogStatus: "PUBLISHED",
            updatedAt: { gte: sevenDaysAgo },
          },
          select: { updatedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const sparkline: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    sparkline.push(
      sparklineProducts.filter((p) => p.updatedAt >= dayStart && p.updatedAt < dayEnd).length,
    );
  }

  let team: Array<{
    id: number;
    name: string;
    email: string;
    published: number;
    pendingReview: number;
    lastActivity: string | null;
  }> = [];
  let smartWarnings: Array<{ level: "warning" | "error"; message: string; href: string }> = [];

  if (isManager) {
    const editors = await prisma.adminUser.findMany({
      where: { active: true, role: "CATALOG_EDITOR" },
      select: { id: true, name: true, email: true },
    });
    team = await Promise.all(
      editors.map(async (u) => {
        const [published, pendingReview, lastAudit] = await Promise.all([
          prisma.product.count({
            where: { createdById: u.id, catalogStatus: "PUBLISHED", ...ACTIVE_PRODUCT_WHERE },
          }),
          prisma.product.count({
            where: { createdById: u.id, catalogStatus: "PENDING_REVIEW", ...ACTIVE_PRODUCT_WHERE },
          }),
          prisma.auditLog.findFirst({
            where: { userId: u.id },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
        ]);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          published,
          pendingReview,
          lastActivity: lastAudit?.createdAt.toISOString() ?? null,
        };
      }),
    );

    const [emptyCats, noAttrCats, noImage24h, zeroPrice] = await Promise.all([
      prisma.category.count({
        where: { active: true, products: { none: { ...ACTIVE_PRODUCT_WHERE } } },
      }),
      prisma.category.count({
        where: { active: true, categoryAttributes: { none: {} } },
      }),
      prisma.product.count({
        where: {
          ...ACTIVE_PRODUCT_WHERE,
          createdAt: { lte: oneDayAgo },
          images: { none: {} },
        },
      }),
      prisma.product.count({ where: { ...ACTIVE_PRODUCT_WHERE, price: 0 } }),
    ]);

    if (emptyCats > 0) {
      smartWarnings.push({
        level: "warning",
        message: `${emptyCats} فئة بلا منتجات`,
        href: "/admin/categories",
      });
    }
    if (noAttrCats > 0) {
      smartWarnings.push({
        level: "warning",
        message: `${noAttrCats} فئة بلا سمات`,
        href: "/admin/categories",
      });
    }
    if (noImage24h > 0) {
      smartWarnings.push({
        level: "warning",
        message: `${noImage24h} منتج بلا صور (+24 ساعة)`,
        href: "/admin/products?smartFilter=no_images",
      });
    }
    if (zeroPrice > 0) {
      smartWarnings.push({
        level: "error",
        message: `${zeroPrice} منتج بسعر 0`,
        href: "/admin/products?smartFilter=zero_price",
      });
    }
  }

  return {
    publishedThisWeek,
    myPendingReview,
    myDrafts,
    myChangesRequested,
    managerNotesCount: unreadCommentsForMe,
    sparkline,
    recentProducts: recentMine.map((p) => ({
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      catalogStatus: p.catalogStatus,
      updatedAt: p.updatedAt.toISOString(),
      imageUrl: p.images[0]?.url ?? null,
    })),
    team: isManager ? team : [],
    warnings: smartWarnings,
    isManager,
  };
}
