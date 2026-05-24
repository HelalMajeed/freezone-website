-- Soft-delete column for Product so bulk "delete" actions in admin become
-- recoverable. Additive only; existing queries that don't know about the
-- column keep working until a follow-up filters them.

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Storefront catalog walks live on `published` + `deletedAt IS NULL`, so the
-- index covers both columns.
CREATE INDEX IF NOT EXISTS "Product_deletedAt_idx"
  ON "Product"("deletedAt");
