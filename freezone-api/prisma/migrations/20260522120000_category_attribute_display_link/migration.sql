-- Link filterable CategoryAttribute rows to optional PDP display spec keys (non-destructive).
ALTER TABLE "CategoryAttribute" ADD COLUMN IF NOT EXISTS "displaySpecKey" TEXT;
ALTER TABLE "CategoryAttribute" ADD COLUMN IF NOT EXISTS "displaySpecNameEn" TEXT;
ALTER TABLE "CategoryAttribute" ADD COLUMN IF NOT EXISTS "displaySpecNameAr" TEXT;
ALTER TABLE "CategoryAttribute" ADD COLUMN IF NOT EXISTS "displaySpecGroup" TEXT;
ALTER TABLE "CategoryAttribute" ADD COLUMN IF NOT EXISTS "displaySpecRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CategoryAttribute" ADD COLUMN IF NOT EXISTS "linkDisplaySpec" BOOLEAN NOT NULL DEFAULT false;
