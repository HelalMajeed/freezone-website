import type { PrismaClient } from "@prisma/client";
import {
  computeCatalogHealthSummary,
  getCategoryHealthRows,
} from "./admin-catalog-health";
import {
  ACTIVE_PRODUCT_WHERE,
  DELETED_PRODUCT_WHERE,
  DRAFT_ACTIVE_WHERE,
  mergeProductWhere,
  PUBLISHED_LIVE_WHERE,
  STALE_IMPORT_DRAFT_WHERE,
} from "./admin-product-scope";

function arCount(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return few;
  return `${n} ${many}`;
}

export async function buildAdminDashboardPayload(prisma: PrismaClient) {
  const [
    totalProducts,
    publishedProducts,
    draftProducts,
    deletedProducts,
    staleImportDrafts,
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
    prisma.product.count({ where: ACTIVE_PRODUCT_WHERE }),
    prisma.product.count({ where: PUBLISHED_LIVE_WHERE }),
    prisma.product.count({ where: DRAFT_ACTIVE_WHERE }),
    prisma.product.count({ where: DELETED_PRODUCT_WHERE }),
    prisma.product.count({ where: STALE_IMPORT_DRAFT_WHERE }),
    prisma.product.count({
      where: mergeProductWhere(ACTIVE_PRODUCT_WHERE, { inStock: true, quantity: { gt: 0 } }),
    }),
    prisma.product.count({
      where: mergeProductWhere(ACTIVE_PRODUCT_WHERE, { inStock: false }),
    }),
    prisma.product.count({
      where: mergeProductWhere(ACTIVE_PRODUCT_WHERE, { inStock: true, quantity: { lte: 0 } }),
    }),
    prisma.category.count({ where: { active: true } }),
    prisma.brand.count(),
    prisma.order.count(),
    prisma.mediaAsset.count(),
    prisma.product.count({
      where: mergeProductWhere(PUBLISHED_LIVE_WHERE, {
        inStock: true,
        quantity: { gt: 0, lte: prisma.product.fields.lowStockThreshold },
      }),
    }),
    prisma.order.count({ where: { status: "pending" } }),
    computeCatalogHealthSummary(prisma),
    prisma.product.findMany({
      where: ACTIVE_PRODUCT_WHERE,
      take: 12,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        published: true,
        inStock: true,
        quantity: true,
        updatedAt: true,
        category: { select: { slug: true, nameEn: true } },
        images: { select: { url: true }, take: 1, orderBy: { sortOrder: "asc" } },
      },
    }),
    getCategoryHealthRows(prisma),
  ]);

  const warnings: { level: "warning" | "error"; message: string; href?: string }[] = [];

  if (staleImportDrafts > 0) {
    warnings.push({
      level: "warning",
      message: arCount(
        staleImportDrafts,
        "مسودة استيراد واحدة لم تُنشر — راجع أو احذف",
        "مسودتا استيراد لم تُنشر — راجع أو احذف",
        "مسودات استيراد لم تُنشر — راجع أو احذف",
      ),
      href: "/admin/products?published=false",
    });
  }
  if (deletedProducts > 0) {
    warnings.push({
      level: "warning",
      message: arCount(
        deletedProducts,
        "منتج محذوف في سلة المهملات",
        "منتجان محذوفان في سلة المهملات",
        "منتجات محذوفة في سلة المهملات",
      ),
      href: "/admin/products?deleted=only",
    });
  }

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
  if (lowStock > 0) {
    warnings.push({
      level: "warning",
      message: arCount(
        lowStock,
        "منتج منشور بمخزون منخفض (<5)",
        "منتجان منشوران بمخزون منخفض",
        "منتجات منشورة بمخزون منخفض",
      ),
      href: "/admin/products?published=true&stock=in",
    });
  }

  return {
    meta: {
      catalogScope: "active-v2",
      generatedAt: new Date().toISOString(),
    },
    stats: {
      totalProducts,
      activeProducts: totalProducts,
      publishedProducts,
      draftProducts,
      deletedProducts,
      staleImportDrafts,
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
      quantity: p.quantity,
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
