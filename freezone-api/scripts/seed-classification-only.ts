/**
 * Sync CategoryAttribute rows from CLASSIFICATION_SEED_BY_SLUG — does not delete products or orders.
 * Run: npm run classification:seed
 */
import { PrismaClient } from "@prisma/client";
import { loadClassificationScriptEnv, maskDatabaseUrl } from "./classification-script-env";
import { CLASSIFICATION_SEED_BY_SLUG } from "../src/lib/classification/seed-presets";
import { syncCategoryAttributesFromFacetKeys } from "../src/lib/classification/sync";

loadClassificationScriptEnv();
console.log(`[seed-classification] DATABASE_URL=${maskDatabaseUrl(process.env.DATABASE_URL!)}`);

const prisma = new PrismaClient();

async function main() {
  let synced = 0;
  let skipped = 0;

  for (const [slug, attrs] of Object.entries(CLASSIFICATION_SEED_BY_SLUG)) {
    const cat = await prisma.category.findUnique({ where: { slug } });
    if (!cat) {
      console.log(`skip (no category in DB): ${slug}`);
      skipped++;
      continue;
    }
    await syncCategoryAttributesFromFacetKeys(prisma, cat.id, attrs);
    console.log(`synced attributes: ${slug} (${attrs.length} definitions)`);
    synced++;
  }

  const productCount = await prisma.product.count();
  console.log("\n--- summary ---");
  console.log(`categories synced: ${synced}`);
  console.log(`categories skipped: ${skipped}`);
  console.log(`products in database (unchanged): ${productCount}`);
  console.log("does NOT run prisma db seed or delete products.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
