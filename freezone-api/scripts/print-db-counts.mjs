#!/usr/bin/env node
/**
 * Safe read-only counts against DATABASE_URL (local, Fly SSH, or CI).
 * Usage (from freezone-api): npm run db:counts
 * On Fly: flyctl ssh console -a freezone-website -C "sh -lc 'cd /app && node scripts/print-db-counts.mjs'"
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const ACTIVE = { deletedAt: null };
const LIVE = { deletedAt: null, published: true };

const prisma = new PrismaClient();
try {
  const [
    productsAll,
    productsActive,
    productsLive,
    productsDraftActive,
    productsDeleted,
    staleImportDrafts,
    categories,
    brands,
    orders,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: ACTIVE }),
    prisma.product.count({ where: LIVE }),
    prisma.product.count({ where: { ...ACTIVE, published: false } }),
    prisma.product.count({ where: { deletedAt: { not: null } } }),
    prisma.product.count({
      where: {
        ...ACTIVE,
        published: false,
        OR: [
          { sourceHandle: { not: null } },
          { importedAt: { not: null } },
          { importBatchId: { not: null } },
        ],
      },
    }),
    prisma.category.count({ where: { active: true } }),
    prisma.brand.count(),
    prisma.order.count(),
  ]);
  console.log(
    JSON.stringify(
      {
        productsAll,
        productsActive,
        productsLiveStorefront: productsLive,
        productsDraftActive,
        productsDeleted,
        staleImportDrafts,
        categoriesActive: categories,
        brands,
        orders,
        note: "Storefront uses productsLiveStorefront (published + not deleted). Dashboard KPIs use productsActive.",
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
