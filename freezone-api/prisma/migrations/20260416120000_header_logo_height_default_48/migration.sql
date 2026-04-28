-- Align DB default with app fallback (48px navbar logo height).
ALTER TABLE "SiteConfig" ALTER COLUMN "headerLogoHeightPx" SET DEFAULT 48;
