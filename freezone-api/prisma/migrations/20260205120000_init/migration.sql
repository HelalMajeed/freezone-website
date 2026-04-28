-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📦',
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "facetKeys" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "brand" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descEn" TEXT NOT NULL DEFAULT '',
    "descAr" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "oldPrice" INTEGER,
    "storage" TEXT NOT NULL DEFAULT '',
    "specs" JSONB,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT NOT NULL DEFAULT '📦',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "sales" INTEGER NOT NULL DEFAULT 0,
    "model3d" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "storeNameEn" TEXT NOT NULL DEFAULT 'FREEZONE',
    "storeNameAr" TEXT NOT NULL DEFAULT 'FREEZONE',
    "taglineEn" TEXT NOT NULL DEFAULT '',
    "taglineAr" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "addressEn" TEXT NOT NULL DEFAULT '',
    "addressAr" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "zainCashWallet" TEXT NOT NULL DEFAULT '',
    "qiCardMerchantId" TEXT NOT NULL DEFAULT '',
    "freeDeliveryThreshold" INTEGER NOT NULL DEFAULT 100000,
    "standardShippingFee" INTEGER NOT NULL DEFAULT 5000,
    "promoBarTextEn" TEXT NOT NULL DEFAULT '',
    "promoBarTextAr" TEXT NOT NULL DEFAULT '',
    "promoBarEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "tickerDirection" TEXT NOT NULL DEFAULT 'left',
    "tickerDurationSec" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "heroAutoplayMs" INTEGER NOT NULL DEFAULT 7000,
    "navItemsJson" JSONB,
    "metaTitleEn" TEXT,
    "metaTitleAr" TEXT,
    "metaDescriptionEn" TEXT,
    "metaDescriptionAr" TEXT,
    "seoKeywords" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" SERIAL NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "layoutMode" TEXT NOT NULL DEFAULT 'structured',
    "freeformLayers" JSONB,
    "badgeEn" TEXT NOT NULL DEFAULT '',
    "badgeAr" TEXT NOT NULL DEFAULT '',
    "titleLine1En" TEXT NOT NULL DEFAULT '',
    "titleLine1Ar" TEXT NOT NULL DEFAULT '',
    "titleLine2En" TEXT NOT NULL DEFAULT '',
    "titleLine2Ar" TEXT NOT NULL DEFAULT '',
    "descEn" TEXT NOT NULL DEFAULT '',
    "descAr" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "primaryLabelEn" TEXT NOT NULL DEFAULT '',
    "primaryLabelAr" TEXT NOT NULL DEFAULT '',
    "primaryHref" TEXT NOT NULL DEFAULT '/products',
    "secondaryLabelEn" TEXT NOT NULL DEFAULT '',
    "secondaryLabelAr" TEXT NOT NULL DEFAULT '',
    "secondaryHref" TEXT NOT NULL DEFAULT '/contact',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stats" JSONB,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TickerItem" (
    "id" SERIAL NOT NULL,
    "textEn" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "iconSuffix" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TickerItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustBarItem" (
    "id" SERIAL NOT NULL,
    "textEn" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL DEFAULT 'truck',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TrustBarItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeSpotlightItem" (
    "id" SERIAL NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '/products',
    "imageUrl" TEXT,
    "iconKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HomeSpotlightItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialLink" (
    "id" SERIAL NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowroomMedia" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "titleEn" TEXT,
    "titleAr" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShowroomMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoBanner" (
    "id" SERIAL NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "subEn" TEXT NOT NULL DEFAULT '',
    "subAr" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '/products',
    "catSlug" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PromoBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

