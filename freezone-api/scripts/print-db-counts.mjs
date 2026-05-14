#!/usr/bin/env node
/**
 * Safe read-only counts against DATABASE_URL (local, Fly SSH, or CI).
 * Usage (from freezone-api): npm run db:counts
 * On Fly: flyctl ssh console -a freezone-website -C "sh -lc 'cd /app && node scripts/print-db-counts.mjs'"
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const [products, productsPublished, categories, brands, orders] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { published: true } }),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.order.count(),
  ]);
  console.log(
    JSON.stringify(
      {
        products,
        productsPublished,
        productsUnpublished: products - productsPublished,
        categories,
        brands,
        orders,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
