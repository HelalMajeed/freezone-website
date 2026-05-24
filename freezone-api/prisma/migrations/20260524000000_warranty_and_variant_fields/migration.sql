-- Round-2 importer schema additions. Everything is nullable + IF NOT EXISTS so the
-- migration is safe to re-run and never breaks an already-deployed row.

-- 1) Product.warranty — first-class column instead of stuffing it inside specs JSON.
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "warranty" TEXT;

-- 2) Bring ProductVariant up to a usable shape: option triples, source provenance,
--    per-variant image override, and a place to keep the raw Shopify variant object.
ALTER TABLE "ProductVariant"
  ADD COLUMN IF NOT EXISTS "oldPrice" INTEGER,
  ADD COLUMN IF NOT EXISTS "optionName1" TEXT,
  ADD COLUMN IF NOT EXISTS "optionValue1" TEXT,
  ADD COLUMN IF NOT EXISTS "optionName2" TEXT,
  ADD COLUMN IF NOT EXISTS "optionValue2" TEXT,
  ADD COLUMN IF NOT EXISTS "optionName3" TEXT,
  ADD COLUMN IF NOT EXISTS "optionValue3" TEXT,
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceVariantId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceRawJson" JSONB;

-- Idempotency anchor for re-running the same import batch. NULL allowed for variants
-- created in the admin UI by hand.
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_productId_sourceVariantId_key"
  ON "ProductVariant"("productId", "sourceVariantId")
  WHERE "sourceVariantId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx"
  ON "ProductVariant"("productId");
