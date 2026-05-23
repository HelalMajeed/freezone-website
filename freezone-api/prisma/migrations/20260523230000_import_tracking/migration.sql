-- Track external source / import batch metadata on Product, plus a separate ImportBatch row
-- per scraper run. All additions are nullable so existing rows are untouched and downstream
-- code that doesn't know about these fields keeps working.

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceHandle" TEXT,
  ADD COLUMN IF NOT EXISTS "sourcePrice" INTEGER,
  ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "importBatchId" TEXT;

CREATE INDEX IF NOT EXISTS "Product_sourceHandle_idx" ON "Product"("sourceHandle");
CREATE INDEX IF NOT EXISTS "Product_importBatchId_idx" ON "Product"("importBatchId");

CREATE TABLE IF NOT EXISTS "ImportBatch" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'running',
  "total" INTEGER NOT NULL DEFAULT 0,
  "succeeded" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "lockOwner" TEXT,
  "results" JSONB,
  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ImportBatch_source_status_idx" ON "ImportBatch"("source", "status");

-- Re-runnable: drop & re-add the FK in case a prior partial apply created it.
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_importBatchId_fkey";
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_importBatchId_fkey"
    FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
