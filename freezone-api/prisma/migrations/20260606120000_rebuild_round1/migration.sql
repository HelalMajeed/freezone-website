-- rebuild_round1 — WS1 backend wave:
--   * OrderStatusEvent (order timeline: status transitions + internal notes)
--   * Notification (persistent dashboard notifications, per-user/broadcast read state)
--   * StockMovement (append-only inventory ledger)
-- Also heals residual drift between the migration history and schema.prisma
-- (defaults + two indexes that earlier `db push` environments already have —
-- hence IF NOT EXISTS on the index statements).

-- AlterTable (drift heal)
ALTER TABLE "Category" ALTER COLUMN "icon" SET DEFAULT '';

-- AlterTable (drift heal)
ALTER TABLE "CategoryAttribute" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable (drift heal)
ALTER TABLE "ProductAttributeValue" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable (drift heal)
ALTER TABLE "ProgressState" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable (drift heal)
ALTER TABLE "SiteConfig" ALTER COLUMN "storeNameEn" SET DEFAULT 'Store',
ALTER COLUMN "storeNameAr" SET DEFAULT 'المتجر';

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'status',
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "userId" INTEGER,
    "userEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "recipientId" INTEGER,
    "type" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL DEFAULT '',
    "bodyAr" TEXT NOT NULL DEFAULT '',
    "href" TEXT,
    "entity" TEXT,
    "entityId" TEXT,
    "payloadJson" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "orderId" INTEGER,
    "qtyBefore" INTEGER,
    "qtyAfter" INTEGER,
    "userId" INTEGER,
    "userEmail" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_kind_createdAt_idx" ON "OrderStatusEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_orderId_idx" ON "StockMovement"("orderId");

-- CreateIndex
CREATE INDEX "StockMovement_reason_createdAt_idx" ON "StockMovement"("reason", "createdAt");

-- CreateIndex (drift heal — already present in db-push environments)
CREATE INDEX IF NOT EXISTS "AdminUser_role_idx" ON "AdminUser"("role");

-- CreateIndex (drift heal — already present in db-push environments)
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_productId_sourceVariantId_key" ON "ProductVariant"("productId", "sourceVariantId");

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
