-- Additive columns for Global Iraq import + admin review (no data loss).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "originalPrice" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "warranty" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sourceHandle" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Product_sourceHandle_key" ON "Product"("sourceHandle");
