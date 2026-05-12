/**
 * Run: npx prisma db seed
 * Requires DATABASE_URL (PostgreSQL)
 *
 * Seeds categories, site config, homepage CMS rows, etc. — does not seed demo products
 * (add products via admin or your own migration).
 */
import { PrismaClient } from "@prisma/client";
import { CATEGORIES } from "../src/lib/data";
import { CATEGORY_FACETS } from "../src/lib/productFacetConfig";
import { defaultFacetNamesForKey } from "../src/lib/facet-attributes";

const prisma = new PrismaClient();

async function main() {
  await prisma.orderLineItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.cmsPageSection.deleteMany();
  await prisma.cmsPage.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tickerItem.deleteMany();
  await prisma.trustBarItem.deleteMany();
  await prisma.homeSpotlightItem.deleteMany();
  await prisma.heroSlide.deleteMany();
  await prisma.promoBanner.deleteMany();
  await prisma.socialLink.deleteMany();
  await prisma.showroomMedia.deleteMany();
  await prisma.siteConfig.deleteMany();

  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const facetKeyList = CATEGORY_FACETS[c.id]?.map((f) => f.key) ?? [];
    const facetKeys = facetKeyList.map((key) => {
      const { name_en, name_ar } = defaultFacetNamesForKey(key);
      return { key, name_en, name_ar };
    });
    await prisma.category.create({
      data: {
        slug: c.id,
        nameEn: c.name,
        nameAr: c.nameAr ?? c.name,
        icon: c.icon,
        color: c.color,
        sortOrder: i,
        facetKeys,
      },
    });
  }

  await prisma.siteConfig.create({
    data: {
      id: 1,
      headerLogoHeightPx: 48,
      storeNameEn: "Store",
      storeNameAr: "المتجر",
      taglineEn: "Iraq's trusted tech partner — CCTV, computers, gaming, smart solutions.",
      taglineAr: "شريكك التقني في العراق — كاميرات، حواسيب، ألعاب وحلول ذكية.",
      phone: "+964 000 000 0000",
      email: "contact@example.com",
      addressEn: "Sinaa Street, Tech Center, Baghdad, Iraq",
      addressAr: "شارع الصناعة، مركز التقنية، بغداد، العراق",
      whatsapp: "+9647742222377",
      promoBarTextEn: "Free delivery on orders +100,000 IQD · 2-year warranty on all products · Iraq-wide delivery",
      promoBarTextAr: "توصيل مجاني فوق 100,000 دينار · ضمان سنتين على كل المنتجات · توصيل لجميع المحافظات",
      metaTitleEn: "Tech store Iraq | CCTV, Computers, Gaming, AI, Smart Home & B2B Tech",
      metaTitleAr: "متجر تقني العراق | كاميرات مراقبة، حواسيب، ألعاب، ذكاء اصطناعي، منزل ذكي وتقنية المؤسسات",
      metaDescriptionEn:
        "Iraq's leading electronics store: CCTV & security, computers & laptops, gaming PCs, components, AI & robots, power & UPS, smart home & cities, servers & networking, data solutions. B2B deals. PC builder. 2-year warranty. Programming & professional services.",
      metaDescriptionAr:
        "متجر إلكترونيات رائد في العراق: أنظمة المراقبة والكاميرات، الحواسيب واللابتوبات، أجهزة الألعاب والمكوّنات، الذكاء الاصطناعي والروبوتات، الطاقة والUPS، المنزل والمدن الذكية، الخوادم والشبكات وحلول البيانات. عروض للشركات. مُجمّع أجهزة. ضمان سنتين. حلول برمجية.",
      seoKeywords:
        "Iraq electronics store, Baghdad CCTV, Hikvision Dahua Iraq, gaming PC Iraq, computer shop Baghdad, smart home Iraq, B2B technology Iraq, server networking Iraq, datacenter Iraq, AI solutions Iraq, robotics Iraq, power solutions UPS Iraq, smart city Iraq, 2 year warranty Iraq, PC builder Iraq",
    },
  });

  await prisma.heroSlide.create({
    data: {
      sortOrder: 0,
      layoutMode: "structured",
      badgeEn: "NEW COLLECTION",
      badgeAr: "تشكيلة جديدة",
      titleLine1En: "PREMIUM",
      titleLine1Ar: "تقنية",
      titleLine2En: "PERFORMANCE",
      titleLine2Ar: " احترافية",
      descEn: "CCTV, gaming rigs, workstations, and smart building solutions — with industry-leading warranty.",
      descAr: "كاميرات، أنظمة ألعاب، محطات عمل، وحلول المباني الذكية — مع ضمان متميز.",
      imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=1600",
      primaryLabelEn: "Shop now",
      primaryLabelAr: "تسوق الآن",
      primaryHref: "/products",
      secondaryLabelEn: "Contact",
      secondaryLabelAr: "تواصل",
      secondaryHref: "/contact",
      active: true,
      stats: [],
    },
  });

  await prisma.trustBarItem.createMany({
    data: [
      { textEn: "Fast Nationwide Delivery", textAr: "توصيل سريع", iconKey: "truck", sortOrder: 0 },
      { textEn: "100% Genuine Products", textAr: "منتجات أصلية", iconKey: "shield-check", sortOrder: 1 },
      { textEn: "Easy 30-Day Returns", textAr: "إرجاع سهل", iconKey: "repeat", sortOrder: 2 },
      { textEn: "24/7 Expert Support", textAr: "دعم فني", iconKey: "headphones", sortOrder: 3 },
    ],
  });

  await prisma.homeSpotlightItem.createMany({
    data: [
      { labelEn: "Laptops", labelAr: "لابتوبات", href: "/products?cat=laptops", iconKey: "laptop", sortOrder: 0, active: true },
      { labelEn: "Monitors", labelAr: "شاشات", href: "/products?cat=monitors", iconKey: "monitor", sortOrder: 1, active: true },
      { labelEn: "Gaming PCs", labelAr: "ألعاب", href: "/products?cat=components", iconKey: "gamepad-2", sortOrder: 2, active: true },
      { labelEn: "Components", labelAr: "مكونات", href: "/products?cat=components", iconKey: "cpu", sortOrder: 3, active: true },
      { labelEn: "Accessories", labelAr: "إكسسوارات", href: "/products?cat=accessories", iconKey: "headphones", sortOrder: 4, active: true },
      { labelEn: "Printers", labelAr: "طابعات", href: "/products?cat=printers", iconKey: "printer", sortOrder: 5, active: true },
      { labelEn: "Tablets & iPad", labelAr: "تابلت وأيباد", href: "/products?cat=tablets", iconKey: "tablet", sortOrder: 6, active: true },
      { labelEn: "Network", labelAr: "شبكات", href: "/products?cat=network", iconKey: "shield-check", sortOrder: 7, active: true },
      { labelEn: "Cables", labelAr: "كوابل", href: "/products?cat=accessories", iconKey: "package", sortOrder: 8, active: true },
    ],
  });

  await prisma.socialLink.createMany({
    data: [
      { platform: "facebook", url: "https://facebook.com", sortOrder: 0 },
      { platform: "instagram", url: "https://instagram.com", sortOrder: 1 },
      { platform: "tiktok", url: "https://tiktok.com", sortOrder: 2 },
    ],
  });

  await prisma.showroomMedia.create({
    data: {
      kind: "image",
      url: "https://images.unsplash.com/photo-1542393545-10f5cde2c810?q=80&w=1200",
      titleEn: "Showroom",
      titleAr: "المعرض",
      sortOrder: 0,
    },
  });

  await prisma.cmsPage.create({
    data: { slug: "home", labelAr: "الصفحة الرئيسية", labelEn: "Homepage" },
  });

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Product"','id'), (SELECT COALESCE(MAX(id), 1) FROM "Product"));`,
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Category"','id'), (SELECT COALESCE(MAX(id), 1) FROM "Category"));`,
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Brand"','id'), (SELECT COALESCE(MAX(id), 1) FROM "Brand"));`,
  );

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
