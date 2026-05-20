import type { PrismaClient } from "@prisma/client";
import {
  computeCatalogHealthSummary,
  getCategoryHealthRows,
} from "./admin-catalog-health";

export async function buildAdminDashboardPayload(prisma: PrismaClient) {
  const [
    totalProducts,
    activeProducts,
    draftProducts,
    outOfStockProducts,
    categoriesCount,
    brandsCount,
    orderCount,
    mediaCount,
    lowStock,
    pendingOrders,
    health,
    recentProducts,
    categoryHealth,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { published: true } }),
    prisma.product.count({ where: { published: false } }),
    prisma.product.count({
      where: { OR: [{ inStock: false }, { quantity: { lte: 0 } }] },
    }),
    prisma.category.count({ where: { active: true } }),
    prisma.brand.count(),
    prisma.order.count(),
    prisma.mediaAsset.count(),
    prisma.product.count({ where: { quantity: { lt: 5 }, published: true } }),
    prisma.order.count({ where: { status: "pending" } }),
    computeCatalogHealthSummary(prisma),
    prisma.product.findMany({
      take: 12,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        published: true,
        inStock: true,
        updatedAt: true,
        category: { select: { slug: true, nameEn: true } },
        images: { select: { url: true }, take: 1, orderBy: { sortOrder: "asc" } },
      },
    }),
    getCategoryHealthRows(prisma),
  ]);

  const warnings: { level: "warning" | "error"; message: string; href?: string }[] = [];
  if (health.productsMissingImages > 0) {
    warnings.push({
      level: "warning",
      message: `${health.productsMissingImages} products without images`,
      href: "/admin/data-quality?tab=missing_images",
    });
  }
  if (health.productsInvalidFilters > 0) {
    warnings.push({
      level: "error",
      message: `${health.productsInvalidFilters} products with invalid filter values`,
      href: "/admin/data-quality?tab=invalid_filters",
    });
  }
  if (health.productsMissingSpecs > 0) {
    warnings.push({
      level: "warning",
      message: `${health.productsMissingSpecs} products missing specs or filter tokens`,
      href: "/admin/data-quality?tab=missing_specs",
    });
  }
  if (health.categoriesWithoutAttributes > 0) {
    warnings.push({
      level: "warning",
      message: `${health.categoriesWithoutAttributes} categories without attributes`,
      href: "/admin/data-quality?tab=categories_without_attributes",
    });
  }
  if (health.productsLegacySpecsOnly > 0) {
    warnings.push({
      level: "warning",
      message: `${health.productsLegacySpecsOnly} products using legacy specs JSON only`,
      href: "/admin/data-quality?tab=legacy_specs",
    });
  }

  return {
    stats: {
      totalProducts,
      activeProducts,
      publishedProducts: activeProducts,
      draftProducts,
      outOfStockProducts,
      categoriesCount,
      brandsCount,
      productsMissingSpecs: health.productsMissingSpecs,
      productsMissingImages: health.productsMissingImages,
      invalidFilterValues: health.productsInvalidFilters,
      orderCount,
      mediaCount,
      lowStock,
      pendingOrders,
    },
    recentProducts: recentProducts.map((p) => ({
      id: p.id,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      published: p.published,
      inStock: p.inStock,
      updatedAt: p.updatedAt.toISOString(),
      categorySlug: p.category.slug,
      categoryName: p.category.nameEn,
      imageUrl: p.images[0]?.url ?? null,
    })),
    categoryHealth,
    warnings,
    catalogHealth: health,
  };
}
