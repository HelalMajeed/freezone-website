#!/usr/bin/env node
/**
 * Read-only table counts for comparing Postgres candidates (no writes).
 * Usage: DATABASE_URL="..." node scripts/survey-db-extended.mjs
 * Or:    node scripts/survey-db-extended.mjs path/to/.env   (loads DATABASE_URL from file)
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";

function loadEnvFile(p) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) return;
  const txt = fs.readFileSync(abs, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v && !process.env.DATABASE_URL) process.env.DATABASE_URL = v;
  }
}

const envArg = process.argv[2];
if (envArg && !envArg.startsWith("-")) loadEnvFile(envArg);

if (!process.env.DATABASE_URL?.trim()) {
  console.error("Missing DATABASE_URL (set env or pass path to .env file)");
  process.exit(1);
}

const prisma = new PrismaClient();

async function count() {
  const [
    products,
    productsPublished,
    categories,
    brands,
    orders,
    productImages,
    productVariants,
    productSecondaryLinks,
    coupons,
    auditLogs,
    heroSlides,
    tickerItems,
    trustBarItems,
    homeSpotlightItems,
    socialLinks,
    showroomMedia,
    promoBanners,
    mediaAssets,
    cmsPages,
    cmsPageSections,
    siteConfigRows,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { published: true } }),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.order.count(),
    prisma.productImage.count(),
    prisma.productVariant.count(),
    prisma.productSecondaryCategory.count(),
    prisma.coupon.count(),
    prisma.auditLog.count(),
    prisma.heroSlide.count(),
    prisma.tickerItem.count(),
    prisma.trustBarItem.count(),
    prisma.homeSpotlightItem.count(),
    prisma.socialLink.count(),
    prisma.showroomMedia.count(),
    prisma.promoBanner.count(),
    prisma.mediaAsset.count(),
    prisma.cmsPage.count(),
    prisma.cmsPageSection.count(),
    prisma.siteConfig.count(),
  ]);

  return {
    products,
    productsPublished,
    productsUnpublished: products - productsPublished,
    categories,
    brands,
    orders,
    productImages,
    productVariants,
    productSecondaryLinks,
    coupons,
    auditLogs,
    heroSlides,
    tickerItems,
    trustBarItems,
    homeSpotlightItems,
    socialLinks,
    showroomMedia,
    promoBanners,
    mediaAssets,
    cmsPages,
    cmsPageSections,
    siteConfigRows,
  };
}

try {
  const out = await count();
  console.log(JSON.stringify(out, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: String(e?.message ?? e) }));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
