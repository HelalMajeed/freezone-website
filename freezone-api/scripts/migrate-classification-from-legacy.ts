/**
 * One-time: sync Category.facetKeys → CategoryAttribute and Product.specs → ProductAttributeValue.
 * Run: npx tsx scripts/migrate-classification-from-legacy.ts
 */
import { PrismaClient } from "@prisma/client";
import { syncCategoryAttributesFromFacetKeys } from "../src/lib/classification/sync";
import { persistProductSpecsForProduct } from "../src/lib/admin-product-specs";

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({ select: { id: true, facetKeys: true } });
  for (const c of categories) {
    if (c.facetKeys) {
      await syncCategoryAttributesFromFacetKeys(prisma, c.id, c.facetKeys);
      console.log(`Category ${c.id}: attributes synced`);
    }
  }

  const products = await prisma.product.findMany({
    select: { id: true, categoryId: true, specs: true },
  });
  for (const p of products) {
    if (!p.specs) continue;
    const r = await persistProductSpecsForProduct(p.id, p.categoryId, p.specs);
    if (!r.ok) console.warn(`Product ${p.id}: ${r.error}`);
    else console.log(`Product ${p.id}: values synced`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
