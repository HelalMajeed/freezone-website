-- Category / attribute active flags
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CategoryAttribute" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "CategoryAttribute_categoryId_filterable_active_idx" ON "CategoryAttribute"("categoryId", "filterable", "active");

-- ProductAttributeValue filter indexes
CREATE INDEX IF NOT EXISTS "ProductAttributeValue_attributeKey_valueNumber_idx" ON "ProductAttributeValue"("attributeKey", "valueNumber");
CREATE INDEX IF NOT EXISTS "ProductAttributeValue_attributeKey_valueBoolean_idx" ON "ProductAttributeValue"("attributeKey", "valueBoolean");
CREATE INDEX IF NOT EXISTS "ProductAttributeValue_attributeKey_valueString_idx" ON "ProductAttributeValue"("attributeKey", "valueString");

-- SiteConfig columns present in schema but missing from older migrations (fixes seed)
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarBgColor" TEXT NOT NULL DEFAULT '#0a0e1a';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarContactColor" TEXT NOT NULL DEFAULT 'rgba(255,255,255,0.65)';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarPhoneLabelEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarPhoneLabelAr" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarWhatsappLabelEn" TEXT NOT NULL DEFAULT 'WhatsApp';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarWhatsappLabelAr" TEXT NOT NULL DEFAULT 'واتساب';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarPhoneIconKey" TEXT NOT NULL DEFAULT 'phone';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarWhatsappIconKey" TEXT NOT NULL DEFAULT 'message-circle';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarPromoIconKey" TEXT NOT NULL DEFAULT 'zap';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarPromoColor" TEXT NOT NULL DEFAULT '#10b981';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarPromoHref" TEXT;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarPhoneHref" TEXT;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarWhatsappHref" TEXT;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarSocialEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarSocialIconSizePx" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarSocialGapPx" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "topBarSocialColor" TEXT NOT NULL DEFAULT '#B00000';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "heroScrimOpacityPct" INTEGER NOT NULL DEFAULT 25;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "trustBarBgColor" TEXT NOT NULL DEFAULT '#030712';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "trustBarBgOpacityPct" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "trustBarTextColor" TEXT NOT NULL DEFAULT '#f8fafc';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "trustBarIconColor" TEXT NOT NULL DEFAULT '';
