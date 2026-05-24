-- Composite indexes called out in Sprint 1. All additive, all IF NOT EXISTS.
-- No data movement, no constraints, just new indexes that catalog + admin
-- queries can use.

-- Storefront filters by (published, categoryId) on every catalog hit.
CREATE INDEX IF NOT EXISTS "Product_published_categoryId_idx"
  ON "Product"("published", "categoryId");

-- The PDP "active variants" query reads (productId, active) — sortOrder is
-- already covered by `ProductVariant(productId)` for the unsorted case.
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_active_idx"
  ON "ProductVariant"("productId", "active");

-- Admin "latest orders" pages always order by createdAt DESC.
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx"
  ON "Order"("createdAt" DESC);
