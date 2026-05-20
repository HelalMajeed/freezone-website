import type { PrismaClient } from "@prisma/client";
import {
  computeCatalogHealthSummary,
  getCategoryHealthRows,
} from "./admin-catalog-health";

function arCount(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return few;
  return `${n} ${many}`;
}

export async function buildAdminDashboardPayload(prisma: PrismaClient) {
  const [
    totalProducts,
    activeProducts,
    draftProducts,
    inStockProducts,
    outOfStockProducts,
    stockNotSetProducts,
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
    prisma.product.count({ where: { inStock: true, quantity: { gt: 0 } } }),
    prisma.product.count({ where: { inStock: false } }),
    prisma.product.count({ where: { inStock: true, quantity: { lte: 0 } } }),
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
  const nImg = health.productsMissingImages;
  if (nImg > 0) {
    warnings.push({
      level: "warning",
      message: arCount(nImg, "منتج واحد بدون صور", "منتجان بدون صور", "منتجات بدون صور"),
      href: "/admin/data-quality?tab=missing_images",
    });
  }
  const nInv = health.productsInvalidFilters;
  if (nInv > 0) {
    warnings.push({
      level: "error",
      message: arCount(nInv, "منتج بفلاتر غير صالحة", "منتجان بفلاتر غير صالحة", "منتجات بفلاتر غير صالحة"),
      href: "/admin/data-quality?tab=invalid_filters",
    });
  }
  const nSpec = health.productsMissingSpecs;
  if (nSpec > 0) {
    warnings.push({
      level: "warning",
      message: arCount(nSpec, "منتج بمواصفات ناقصة", "منتجان بمواصفات ناقصة", "منتجات بمواصفات ناقصة"),
      href: "/admin/data-quality?tab=missing_specs",
    });
  }
  const nCat = health.categoriesWithoutAttributes;
  if (nCat > 0) {
    warnings.push({
      level: "warning",
      message: arCount(nCat, "قسم بلا سمات", "قسمان بلا سمات", "أقسام بلا سمات"),
      href: "/admin/data-quality?tab=categories_without_attributes",
    });
  }
  const nLeg = health.productsLegacySpecsOnly;
  if (nLeg > 0) {
    warnings.push({
      level: "warning",
      message: arCount(nLeg, "منتج Legacy specs فقط", "منتجان Legacy specs فقط", "منتجات Legacy specs فقط"),
      href: "/admin/data-quality?tab=legacy_specs",
    });
  }

  return {
    stats: {
      totalProducts,
      activeProducts,
      publishedProducts: activeProducts,
      draftProducts,
      inStockProducts,
      outOfStockProducts,
      stockNotSetProducts,
      categoriesCount,
      brandsCount,
      productsMissingSpecs: health.productsMissingSpecs,
      productsMissingImages: health.productsMissingImages,
      invalidFilterValues: health.productsInvalidFilters,
      categoriesWithoutAttributes: health.categoriesWithoutAttributes,
      productsLegacySpecsOnly: health.productsLegacySpecsOnly,
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
