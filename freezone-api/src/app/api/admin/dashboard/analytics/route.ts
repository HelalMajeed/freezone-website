import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { jsonError, jsonOk } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { parseDateRangeParam } from "@/lib/admin-orders-query";

/**
 * GET /api/admin/dashboard/analytics — range analytics (contract (f) in
 * docs/API_CONTRACTS.md).
 *
 * Query: `from`, `to` (default last 30 days ending today), `compare`
 * (`true|false`, default `true` — adds the immediately-preceding period of
 * equal length). Cancelled orders are excluded from all revenue/AOV/unit
 * numbers; they appear only in `totals.cancelledOrders`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const LIST_CAP = 20;
const TOP_PRODUCTS_CAP = 10;
/** Hard cap on the queryable span so a single request can never scan and
 *  materialize the entire order/line-item history into Node memory. */
const MAX_RANGE_DAYS = 366;

const DELETED_EN = "(deleted)";
const DELETED_AR = "(محذوف)";

type PeriodTotals = {
  revenue: number;
  orders: number;
  aov: number;
  units: number;
  discount: number;
  shipping: number;
  cancelledOrders: number;
};

export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const toEnd =
    parseDateRangeParam(searchParams.get("to"), "to") ?? parseDateRangeParam(today, "to")!;
  const fromStart =
    parseDateRangeParam(searchParams.get("from"), "from") ??
    new Date(toEnd.getTime() + 1 - 30 * DAY_MS);
  if (fromStart.getTime() > toEnd.getTime()) return jsonError(400, "VALIDATION");
  const compare = searchParams.get("compare") !== "false";

  /** Whole days in the range (from 00:00:00.000 → to 23:59:59.999). */
  const rangeDays = Math.round((toEnd.getTime() + 1 - fromStart.getTime()) / DAY_MS);
  if (rangeDays > MAX_RANGE_DAYS) return jsonError(400, "RANGE_TOO_LARGE");
  const prevToEnd = new Date(fromStart.getTime() - 1);
  const prevFromStart = new Date(fromStart.getTime() - rangeDays * DAY_MS);

  try {
    const [totals, dayRows, lineItems, cityGroups, couponGroups, previous] = await Promise.all([
      computePeriodTotals(fromStart, toEnd),
      prisma.order.findMany({
        where: rangeWhere(fromStart, toEnd, { excludeCancelled: true }),
        select: { createdAt: true, total: true },
      }),
      prisma.orderLineItem.findMany({
        where: { order: rangeWhere(fromStart, toEnd, { excludeCancelled: true }) },
        select: {
          qty: true,
          priceSnapshot: true,
          productId: true,
          product: {
            select: {
              id: true,
              slug: true,
              nameEn: true,
              nameAr: true,
              categoryId: true,
              brandId: true,
              category: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
              brandRef: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
            },
          },
        },
      }),
      prisma.order.groupBy({
        by: ["city"],
        where: rangeWhere(fromStart, toEnd, { excludeCancelled: true }),
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.order.groupBy({
        by: ["couponCode"],
        where: {
          ...rangeWhere(fromStart, toEnd, { excludeCancelled: true }),
          couponCode: { not: null },
        },
        _count: { _all: true },
        _sum: { total: true, discountTotal: true },
      }),
      /** Previous-period totals run concurrently — they have no dependency on
       *  the current-period batch. */
      compare ? computePeriodTotals(prevFromStart, prevToEnd) : Promise.resolve(null),
    ]);

    /** revenueByDay — zero-filled for every day in the range. */
    const revenueByDay: Array<{ date: string; revenue: number; orders: number }> = [];
    const dayIndex = new Map<string, number>();
    for (let i = 0; i < rangeDays; i++) {
      const date = new Date(fromStart.getTime() + i * DAY_MS).toISOString().slice(0, 10);
      dayIndex.set(date, revenueByDay.length);
      revenueByDay.push({ date, revenue: 0, orders: 0 });
    }
    for (const o of dayRows) {
      const idx = dayIndex.get(o.createdAt.toISOString().slice(0, 10));
      if (idx != null) {
        revenueByDay[idx].revenue += o.total;
        revenueByDay[idx].orders += 1;
      }
    }

    /** Category / brand / product attribution over line items (current
     *  primary category/brand — line items don't snapshot category). */
    type GroupRow = {
      id: number | null;
      slug: string | null;
      nameEn: string;
      nameAr: string;
      revenue: number;
      units: number;
    };
    const byCategory = new Map<string, GroupRow>();
    const byBrand = new Map<string, GroupRow>();
    const byProduct = new Map<
      string,
      { productId: number | null; slug: string | null; nameEn: string; nameAr: string; units: number; revenue: number }
    >();
    let lineRevenueTotal = 0;

    for (const line of lineItems) {
      const revenue = line.priceSnapshot * line.qty;
      lineRevenueTotal += revenue;
      const p = line.product;

      const catKey = p ? `c${p.categoryId}` : "deleted";
      const cat = byCategory.get(catKey) ?? {
        id: p ? p.categoryId : null,
        slug: p?.category?.slug ?? null,
        nameEn: p ? p.category?.nameEn ?? "" : DELETED_EN,
        nameAr: p ? p.category?.nameAr ?? "" : DELETED_AR,
        revenue: 0,
        units: 0,
      };
      cat.revenue += revenue;
      cat.units += line.qty;
      byCategory.set(catKey, cat);

      const brandKey = p ? (p.brandId != null ? `b${p.brandId}` : "none") : "deleted";
      const brand = byBrand.get(brandKey) ?? {
        id: p?.brandId ?? null,
        slug: p?.brandRef?.slug ?? null,
        nameEn: p ? p.brandRef?.nameEn ?? "(no brand)" : DELETED_EN,
        nameAr: p ? p.brandRef?.nameAr ?? "(بدون علامة)" : DELETED_AR,
        revenue: 0,
        units: 0,
      };
      brand.revenue += revenue;
      brand.units += line.qty;
      byBrand.set(brandKey, brand);

      const prodKey = p ? `p${p.id}` : `x${line.productId ?? 0}`;
      const prod = byProduct.get(prodKey) ?? {
        productId: p?.id ?? null,
        slug: p?.slug ?? null,
        nameEn: p?.nameEn ?? DELETED_EN,
        nameAr: p?.nameAr ?? DELETED_AR,
        units: 0,
        revenue: 0,
      };
      prod.units += line.qty;
      prod.revenue += revenue;
      byProduct.set(prodKey, prod);
    }

    const sharePct = (revenue: number) =>
      lineRevenueTotal > 0 ? Math.round((revenue / lineRevenueTotal) * 1000) / 10 : 0;

    const revenueByCategory = [...byCategory.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, LIST_CAP)
      .map((c) => ({
        categoryId: c.id,
        slug: c.slug,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        revenue: c.revenue,
        units: c.units,
        sharePct: sharePct(c.revenue),
      }));

    const revenueByBrand = [...byBrand.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, LIST_CAP)
      .map((b) => ({
        brandId: b.id,
        slug: b.slug,
        nameEn: b.nameEn,
        nameAr: b.nameAr,
        revenue: b.revenue,
        units: b.units,
        sharePct: sharePct(b.revenue),
      }));

    const topProducts = [...byProduct.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, TOP_PRODUCTS_CAP)
      .map((p) => ({
        productId: p.productId,
        slug: p.slug,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        units: p.units,
        revenue: p.revenue,
      }));

    const salesByCity = cityGroups
      .map((c) => ({
        city: c.city,
        orders: c._count._all,
        revenue: c._sum.total ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, LIST_CAP);

    /** Coupon labels from the Coupon table (codes survive coupon deletion). */
    const couponCodes = couponGroups
      .map((c) => c.couponCode)
      .filter((c): c is string => Boolean(c));
    const coupons = couponCodes.length
      ? await prisma.coupon.findMany({
          where: { code: { in: couponCodes } },
          select: { code: true, labelEn: true, labelAr: true },
        })
      : [];
    const couponByCode = new Map(coupons.map((c) => [c.code, c]));
    const couponPerformance = couponGroups
      .filter((c): c is typeof c & { couponCode: string } => Boolean(c.couponCode))
      .map((c) => ({
        code: c.couponCode,
        labelEn: couponByCode.get(c.couponCode)?.labelEn ?? "",
        labelAr: couponByCode.get(c.couponCode)?.labelAr ?? "",
        uses: c._count._all,
        discountTotal: c._sum.discountTotal ?? 0,
        revenue: c._sum.total ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, LIST_CAP);

    return jsonOk({
      range: { from: fromStart.toISOString().slice(0, 10), to: toEnd.toISOString().slice(0, 10) },
      previousRange: compare
        ? {
            from: prevFromStart.toISOString().slice(0, 10),
            to: prevToEnd.toISOString().slice(0, 10),
          }
        : null,
      totals,
      previous,
      delta: {
        revenuePct: deltaPct(totals.revenue, previous?.revenue),
        ordersPct: deltaPct(totals.orders, previous?.orders),
        aovPct: deltaPct(totals.aov, previous?.aov),
        unitsPct: deltaPct(totals.units, previous?.units),
      },
      revenueByDay,
      revenueByCategory,
      revenueByBrand,
      salesByCity,
      couponPerformance,
      topProducts,
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

function rangeWhere(
  from: Date,
  to: Date,
  opts: { excludeCancelled: boolean },
): Prisma.OrderWhereInput {
  return {
    createdAt: { gte: from, lte: to },
    ...(opts.excludeCancelled ? { status: { not: "cancelled" } } : {}),
  };
}

async function computePeriodTotals(from: Date, to: Date): Promise<PeriodTotals> {
  const [agg, cancelledOrders, unitsAgg] = await Promise.all([
    prisma.order.aggregate({
      where: rangeWhere(from, to, { excludeCancelled: true }),
      _count: { _all: true },
      _sum: { total: true, discountTotal: true, shipping: true },
    }),
    prisma.order.count({
      where: { createdAt: { gte: from, lte: to }, status: "cancelled" },
    }),
    prisma.orderLineItem.aggregate({
      where: { order: rangeWhere(from, to, { excludeCancelled: true }) },
      _sum: { qty: true },
    }),
  ]);
  const revenue = agg._sum.total ?? 0;
  const orders = agg._count._all;
  return {
    revenue,
    orders,
    aov: orders > 0 ? Math.floor(revenue / orders) : 0,
    units: unitsAgg._sum.qty ?? 0,
    discount: agg._sum.discountTotal ?? 0,
    shipping: agg._sum.shipping ?? 0,
    cancelledOrders,
  };
}

/** Period-over-period percent change, rounded to 1 decimal; null when no/zero baseline. */
function deltaPct(current: number, previous: number | undefined | null): number | null {
  if (previous == null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
