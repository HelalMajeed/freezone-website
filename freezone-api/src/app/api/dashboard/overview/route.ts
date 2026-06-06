import { prisma } from "@/lib/prisma";
import { guardDashboard, jsonOk } from "@/lib/dashboard-guard";
import { ACTIVE_PRODUCT_WHERE, mergeProductWhere, PUBLISHED_LIVE_WHERE } from "@/lib/admin-product-scope";

/**
 * GET /api/dashboard/overview
 *
 * Aggregated stats for the dashboard home page:
 *  - KPI counters: products, categories, brands, orders today / this week,
 *    revenue today / this week, active coupons.
 *  - Orders status breakdown.
 *  - Low-stock products (quantity ≤ threshold).
 *  - Top 5 best-selling products (by `sales` counter).
 *  - Recent 8 orders.
 *  - 14-day revenue + order count sparkline.
 */
export async function GET(req: Request): Promise<Response> {
  const g = await guardDashboard(req);
  if (!g.ok) return g.response;

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(startToday);
  startWeek.setDate(startToday.getDate() - 6); // last 7 days including today
  const startSpark = new Date(startToday);
  startSpark.setDate(startToday.getDate() - 13);

  const [
    productCount,
    categoryCount,
    brandCount,
    ordersTodayAgg,
    ordersWeekAgg,
    statusGroups,
    lowStock,
    topProducts,
    recentOrders,
    couponsActive,
    sparkOrders,
  ] = await Promise.all([
    prisma.product.count({ where: ACTIVE_PRODUCT_WHERE }),
    prisma.category.count({ where: { active: true } }),
    prisma.brand.count({ where: { active: true } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startToday } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startWeek } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.product.findMany({
      /** Low stock = below the product's own configurable threshold (not a hardcoded 5). */
      where: mergeProductWhere(PUBLISHED_LIVE_WHERE, {
        inStock: true,
        quantity: { gt: 0, lte: prisma.product.fields.lowStockThreshold },
      }),
      orderBy: { quantity: "asc" },
      take: 8,
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        sku: true,
        quantity: true,
        lowStockThreshold: true,
        price: true,
        brand: true,
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
    prisma.product.findMany({
      where: PUBLISHED_LIVE_WHERE,
      orderBy: [{ sales: "desc" }, { reviews: "desc" }],
      take: 5,
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        sales: true,
        price: true,
        rating: true,
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerName: true,
        total: true,
        createdAt: true,
        paymentMethod: true,
      },
    }),
    prisma.coupon.count({
      where: {
        active: true,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: startSpark } },
      select: { createdAt: true, total: true },
    }),
  ]);

  // Build 14-day buckets (oldest → newest)
  const sparkline: Array<{ date: string; orders: number; revenue: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(startToday);
    d.setDate(startToday.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    sparkline.push({ date: dateStr, orders: 0, revenue: 0 });
  }
  const idxByDate = new Map(sparkline.map((b, i) => [b.date, i]));
  for (const o of sparkOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const idx = idxByDate.get(key);
    if (idx != null) {
      sparkline[idx].orders += 1;
      sparkline[idx].revenue += o.total;
    }
  }

  // Normalize status groups
  const statusCounts: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const g of statusGroups) statusCounts[g.status] = g._count._all;

  return jsonOk({
    kpis: {
      products: productCount,
      categories: categoryCount,
      brands: brandCount,
      activeCoupons: couponsActive,
      ordersToday: ordersTodayAgg._count._all,
      revenueToday: ordersTodayAgg._sum.total ?? 0,
      ordersWeek: ordersWeekAgg._count._all,
      revenueWeek: ordersWeekAgg._sum.total ?? 0,
    },
    statusCounts,
    lowStock,
    topProducts,
    recentOrders,
    sparkline,
  });
}
