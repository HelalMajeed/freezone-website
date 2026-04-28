-- Hero slider prev/next: arrow color+opacity and box fill color+opacity (CMS)
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "heroNavArrowColor" TEXT NOT NULL DEFAULT '#ffffff';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "heroNavArrowOpacityPct" INTEGER NOT NULL DEFAULT 80;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "heroNavBoxColor" TEXT NOT NULL DEFAULT '#ffffff';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "heroNavBoxOpacityPct" INTEGER NOT NULL DEFAULT 8;
