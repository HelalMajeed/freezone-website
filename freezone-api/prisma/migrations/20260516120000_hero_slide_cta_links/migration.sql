-- Hero CTA: optional structured link JSON (product / category / brand / custom URL)
ALTER TABLE "HeroSlide" ADD COLUMN "primaryLink" JSONB;
ALTER TABLE "HeroSlide" ADD COLUMN "secondaryLink" JSONB;
