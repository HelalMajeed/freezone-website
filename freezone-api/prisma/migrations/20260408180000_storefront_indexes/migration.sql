-- فهارس لاستعلامات المتجر (published، التصنيف، العلامة، صور المنتج)
CREATE INDEX IF NOT EXISTS "Product_published_idx" ON "Product"("published");
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX IF NOT EXISTS "Brand_active_sortOrder_idx" ON "Brand"("active", "sortOrder");
CREATE INDEX IF NOT EXISTS "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");
