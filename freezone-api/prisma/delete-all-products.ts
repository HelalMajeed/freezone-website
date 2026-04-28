/**
 * One-off: remove every row from Product (cascades images + variants).
 * OrderLineItem.productId is SetNull — past orders keep line snapshots.
 *
 * Run from freezone-api with DATABASE_URL set:
 *   npm run db:delete-products
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.product.count();
  const result = await prisma.product.deleteMany({});
  console.log(`Deleted ${result.count} products (was ${before} rows). Cascades: ProductImage, ProductVariant. Order lines: productId → null.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
