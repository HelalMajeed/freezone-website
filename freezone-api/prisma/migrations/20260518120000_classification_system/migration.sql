-- Universal product classification: CategoryAttribute + ProductAttributeValue
-- Aligns with docs/classification (FRAMEWORK.md)

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "parentId" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "model" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "CategoryAttribute" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SELECT',
    "options" JSONB,
    "filterable" BOOLEAN NOT NULL DEFAULT true,
    "searchable" BOOLEAN NOT NULL DEFAULT false,
    "comparable" BOOLEAN NOT NULL DEFAULT false,
    "displayGroup" TEXT NOT NULL DEFAULT 'specs',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryAttribute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductAttributeValue" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "attributeKey" TEXT NOT NULL,
    "valueString" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBoolean" BOOLEAN,
    "valueJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CategoryAttribute_categoryId_key_key" ON "CategoryAttribute"("categoryId", "key");
CREATE INDEX IF NOT EXISTS "CategoryAttribute_categoryId_sortOrder_idx" ON "CategoryAttribute"("categoryId", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "ProductAttributeValue_productId_attributeKey_key" ON "ProductAttributeValue"("productId", "attributeKey");
CREATE INDEX IF NOT EXISTS "ProductAttributeValue_productId_idx" ON "ProductAttributeValue"("productId");
CREATE INDEX IF NOT EXISTS "ProductAttributeValue_attributeKey_idx" ON "ProductAttributeValue"("attributeKey");

DO $$ BEGIN
  ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CategoryAttribute" ADD CONSTRAINT "CategoryAttribute_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Category_parentId_sortOrder_idx" ON "Category"("parentId", "sortOrder");
