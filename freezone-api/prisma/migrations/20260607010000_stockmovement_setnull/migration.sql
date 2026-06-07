-- StockMovement durability: keep the append-only inventory ledger when a
-- product is hard-deleted. Make productId nullable and switch the FK from
-- ON DELETE CASCADE to ON DELETE SET NULL. Non-destructive: the table, its
-- rows, and the productId index are all preserved; only the column nullability
-- and the FK action change.

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_productId_fkey";

-- AlterTable
ALTER TABLE "StockMovement" ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
