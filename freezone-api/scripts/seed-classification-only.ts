/**
 * Sync CategoryAttribute rows from CLASSIFICATION_SEED_BY_SLUG — does not delete products or orders.
 * Run: npx tsx scripts/seed-classification-only.ts
 */
import { PrismaClient } from "@prisma/client";
import { CLASSIFICATION_SEED_BY_SLUG } from "../src/lib/classification/seed-presets";
import { syncCategoryAttributesFromFacetKeys } from "../src/lib/classification/sync";

const prisma = new PrismaClient();

async function main() {
  for (const [slug, attrs] of Object.entries(CLASSIFICATION_SEED_BY_SLUG)) {
    const cat = await prisma.category.findUnique({ where: { slug } });
    if (!cat) {
      console.log(`skip (no category): ${slug}`);
      continue;
    }
    await syncCategoryAttributesFromFacetKeys(prisma, cat.id, attrs);
    console.log(`synced attributes: ${slug} (${attrs.length})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
