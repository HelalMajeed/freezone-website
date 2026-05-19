/**
 * Map legacy product.specs keys → CategoryAttribute keys and persist ProductAttributeValue.
 * Safe to re-run (idempotent per product).
 *
 * Run: npx tsx scripts/sync-legacy-product-specs.ts
 */
import { PrismaClient } from "@prisma/client";
import { loadCategoryAttributeSchema, saveProductSpecsNormalized } from "../src/lib/classification/persist";
import { remapLegacySpecsForCategory } from "../src/lib/classification/legacy-spec-map";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      categoryId: true,
      specs: true,
      category: { select: { slug: true } },
    },
  });

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const p of products) {
    const specs =
      p.specs && typeof p.specs === "object" && !Array.isArray(p.specs)
        ? (p.specs as Record<string, string>)
        : null;
    if (!specs || !Object.keys(specs).length) {
      skip++;
      continue;
    }

    const schema = await loadCategoryAttributeSchema(
      (args) => prisma.categoryAttribute.findMany(args),
      p.categoryId,
    );
    if (!schema.length) {
      skip++;
      continue;
    }

    const remapped = remapLegacySpecsForCategory(
      p.category.slug,
      specs,
      schema.map((a) => a.key),
    );
    if (!Object.keys(remapped).length) {
      skip++;
      continue;
    }

    const merged = { ...specs, ...remapped };
    const schemaRelaxed = schema.map((a) => ({ ...a, options: null }));
    const r = await saveProductSpecsNormalized(prisma, p.id, schemaRelaxed, merged);
    if (!r.ok) {
      console.warn(`product ${p.id} (${p.category.slug}): ${"error" in r ? r.error : "failed"}`);
      fail++;
      continue;
    }
    await prisma.product.update({
      where: { id: p.id },
      data: { specs: r.specs as object },
    });
    console.log(`product ${p.id} (${p.category.slug}): synced ${Object.keys(remapped).length} attrs`);
    ok++;
  }

  console.log(`done: ok=${ok} skip=${skip} fail=${fail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
