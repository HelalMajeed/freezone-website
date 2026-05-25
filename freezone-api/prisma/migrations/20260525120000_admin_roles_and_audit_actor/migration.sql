-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'CATALOG_MANAGER', 'CATALOG_EDITOR');

-- AlterTable AdminUser: String role -> AdminRole enum
ALTER TABLE "AdminUser" ADD COLUMN "role_new" "AdminRole";

UPDATE "AdminUser" SET "role_new" = CASE
  WHEN "role" = 'superadmin' THEN 'SUPER_ADMIN'::"AdminRole"
  WHEN "role" = 'admin' THEN 'CATALOG_MANAGER'::"AdminRole"
  WHEN "role" = 'editor' THEN 'CATALOG_EDITOR'::"AdminRole"
  WHEN "role" = 'viewer' THEN 'CATALOG_EDITOR'::"AdminRole"
  ELSE 'CATALOG_EDITOR'::"AdminRole"
END;

ALTER TABLE "AdminUser" ALTER COLUMN "role_new" SET NOT NULL;
ALTER TABLE "AdminUser" ALTER COLUMN "role_new" SET DEFAULT 'CATALOG_EDITOR';
ALTER TABLE "AdminUser" DROP COLUMN "role";
ALTER TABLE "AdminUser" RENAME COLUMN "role_new" TO "role";

-- AlterTable AuditLog: actor metadata
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userId" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userEmail" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "ip" TEXT;

CREATE INDEX IF NOT EXISTS "AuditLog_entity_createdAt_idx" ON "AuditLog"("entity", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
