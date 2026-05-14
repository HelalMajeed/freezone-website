#!/usr/bin/env node
/** Read-only counts + hero/promo titles for homepage/CMS comparison. */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const [heroSlide, siteConfig, tickerItem, trustBarItem, homeSpotlight, cmsPage, cmsPageSection, product, category, brand, promoBanner] =
    await Promise.all([
      prisma.heroSlide.count(),
      prisma.siteConfig.count(),
      prisma.tickerItem.count(),
      prisma.trustBarItem.count(),
      prisma.homeSpotlightItem.count(),
      prisma.cmsPage.count(),
      prisma.cmsPageSection.count(),
      prisma.product.count(),
      prisma.category.count(),
      prisma.brand.count(),
      prisma.promoBanner.count(),
    ]);
  const slides = await prisma.heroSlide.findMany({
    select: { id: true, titleLine1En: true, titleLine2En: true, badgeEn: true, active: true },
    orderBy: { sortOrder: "asc" },
  });
  const promos = await prisma.promoBanner.findMany({
    take: 8,
    select: { id: true, titleEn: true },
    orderBy: { sortOrder: "asc" },
  });
  const homeSections = await prisma.cmsPageSection.count({
    where: { page: { slug: "home" }, visible: true, publishedPayload: { not: null } },
  });
  console.log(
    JSON.stringify(
      {
        counts: {
          heroSlide,
          siteConfig,
          tickerItem,
          trustBarItem,
          homeSpotlight,
          cmsPage,
          cmsPageSection,
          publishedHomeSections: homeSections,
          product,
          category,
          brand,
          promoBanner,
        },
        heroSlides: slides,
        promoBanners: promos,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.log(JSON.stringify({ error: String(e?.message ?? e) }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
