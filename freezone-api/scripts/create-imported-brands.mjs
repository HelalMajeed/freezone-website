#!/usr/bin/env node
/**
 * One-time: create `Brand` rows for the imported vendors that only exist as
 * free-text `Product.brand` (the importer set the vendor string but left
 * `brandId` null, so brand listing/landing pages don't show them).
 *
 *   node scripts/create-imported-brands.mjs            # dry run
 *   node scripts/create-imported-brands.mjs --confirm  # apply
 *
 * The storefront derives a brand's page slug from its NAME (BrandLandingPage
 * `brandSlug(name)`) and filters products by `brandSlug(p.brand)`, so a Brand
 * row whose `nameEn` equals the exact `Product.brand` text is enough to make the
 * brand appear AND its page resolve to the right products. We set the DB `slug`
 * with the same slugify (deduped) for consistency/uniqueness. Safe to re-run.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes("--confirm");

/** Mirror of freezone-web BrandLandingPage.brandSlug (keep in sync). */
function brandSlug(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const vendors = await prisma.product.groupBy({
    by: ["brand"],
    where: { published: true, deletedAt: null, brand: { not: "" } },
    _count: { _all: true },
  });
  const existing = await prisma.brand.findMany({ select: { nameEn: true, slug: true } });
  const haveName = new Set(existing.map((b) => b.nameEn.toLowerCase().trim()));
  const usedSlugs = new Set(existing.map((b) => b.slug.toLowerCase()));

  const toCreate = [];
  for (const v of vendors.sort((a, b) => b._count._all - a._count._all)) {
    const name = (v.brand || "").trim();
    if (!name || haveName.has(name.toLowerCase())) continue;
    let slug = brandSlug(name) || `brand-${toCreate.length + 1}`;
    let s = slug, i = 2;
    while (usedSlugs.has(s)) s = `${slug}-${i++}`;
    usedSlugs.add(s);
    toCreate.push({ slug: s, nameEn: name, nameAr: name, products: v._count._all });
  }

  console.log(`existing brands: ${existing.length} | new to create: ${toCreate.length}`);
  console.log(toCreate.map((b) => `${b.slug} (${b.products})`).join(", "));

  if (!CONFIRM) {
    console.log("\n[dry-run] no rows written. Re-run with --confirm to create.");
    return;
  }

  let created = 0;
  // Keep imported brands after the curated originals in default ordering.
  let sort = 100;
  for (const b of toCreate) {
    await prisma.brand.create({
      data: { slug: b.slug, nameEn: b.nameEn, nameAr: b.nameAr, active: true, sortOrder: sort++ },
    });
    created++;
  }
  console.log(`\n✓ created ${created} brand rows. (Storefront brand cache TTL ~60s.)`);
}

main()
  .catch((e) => { console.error("ERR", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
