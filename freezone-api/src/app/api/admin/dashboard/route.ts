import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { buildAdminDashboardPayload } from "@/lib/admin-dashboard";

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({
      dbConnected: false,
      stats: {
        totalProducts: 0,
        activeProducts: 0,
        publishedProducts: 0,
        draftProducts: 0,
        inStockProducts: 0,
        outOfStockProducts: 0,
        stockNotSetProducts: 0,
        categoriesCount: 0,
        brandsCount: 0,
        productsMissingSpecs: 0,
        productsMissingImages: 0,
        invalidFilterValues: 0,
        categoriesWithoutAttributes: 0,
        productsLegacySpecsOnly: 0,
        orderCount: 0,
        mediaCount: 0,
        lowStock: 0,
        pendingOrders: 0,
      },
      recentProducts: [],
      categoryHealth: [],
      warnings: [],
      catalogHealth: {},
    });
  }
  try {
    const payload = await buildAdminDashboardPayload(prisma);
    return Response.json({ dbConnected: true, ...payload });
  } catch {
    return Response.json(
      {
        dbConnected: false,
        connectionFailed: true,
        stats: {
          totalProducts: 0,
          activeProducts: 0,
          publishedProducts: 0,
          draftProducts: 0,
          inStockProducts: 0,
          outOfStockProducts: 0,
          stockNotSetProducts: 0,
          categoriesCount: 0,
          brandsCount: 0,
          productsMissingSpecs: 0,
          productsMissingImages: 0,
          invalidFilterValues: 0,
          categoriesWithoutAttributes: 0,
          productsLegacySpecsOnly: 0,
          orderCount: 0,
          mediaCount: 0,
          lowStock: 0,
          pendingOrders: 0,
        },
        recentProducts: [],
        categoryHealth: [],
        warnings: [],
        catalogHealth: {},
      },
      { status: 200 },
    );
  }
}
