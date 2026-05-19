-- Separate full display text from normalized filter values
ALTER TABLE "ProductAttributeValue" ADD COLUMN IF NOT EXISTS "displayValue" TEXT;
