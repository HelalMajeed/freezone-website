import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import {
  ACTIVE_PRODUCT_WHERE,
  PUBLISHED_LIVE_WHERE,
} from "@/lib/admin-product-scope";

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({
      dbConnected: false,
      productCount: 0,
      orderCount: 0,
      categoryCount: 0,
      brandCount: 0,
      mediaCount: 0,
      lowStock: 0,
      pendingOrders: 0,
    });
  }
  try {
    const [productCount, orderCount, categoryCount, brandCount, mediaCount, lowStock, pendingOrders] =
      await Promise.all([
        prisma.product.count({ where: ACTIVE_PRODUCT_WHERE }),
        prisma.order.count(),
        prisma.category.count({ where: { active: true } }),
        prisma.brand.count(),
        prisma.mediaAsset.count(),
        prisma.product.count({
          where: {
            ...PUBLISHED_LIVE_WHERE,
            inStock: true,
            quantity: { gt: 0, lte: prisma.product.fields.lowStockThreshold },
          },
        }),
        prisma.order.count({ where: { status: "pending" } }),
      ]);
    return Response.json({
      dbConnected: true,
      productCount,
      orderCount,
      categoryCount,
      brandCount,
      mediaCount,
      lowStock,
      pendingOrders,
    });
  } catch {
    /** 200 + flags so the admin UI can show a DB message without treating it as a transport error */
    return Response.json({
      dbConnected: false,
      connectionFailed: true,
      productCount: 0,
      orderCount: 0,
      categoryCount: 0,
      brandCount: 0,
      mediaCount: 0,
      lowStock: 0,
      pendingOrders: 0,
    });
  }
}
