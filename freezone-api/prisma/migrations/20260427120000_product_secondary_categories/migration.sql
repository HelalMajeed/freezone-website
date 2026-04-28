-- Additional storefront categories (primary remains Product.categoryId).

CREATE TABLE "ProductSecondaryCategory" (
    "productId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "ProductSecondaryCategory_pkey" PRIMARY KEY ("productId","categoryId")
);

CREATE INDEX "ProductSecondaryCategory_categoryId_idx" ON "ProductSecondaryCategory"("categoryId");

ALTER TABLE "ProductSecondaryCategory" ADD CONSTRAINT "ProductSecondaryCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductSecondaryCategory" ADD CONSTRAINT "ProductSecondaryCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
