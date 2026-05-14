#!/usr/bin/env node
/**
 * Read-only: counts rows referencing /uploads/ and audit log summary.
 * Loads DATABASE_URL from env only (dotenv). Does not print connection strings.
 * Usage: node scripts/investigate-upload-references.mjs
 * Optional: DATABASE_URL=... node scripts/investigate-upload-references.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function scalar(sql) {
  const rows = await prisma.$queryRawUnsafe(sql);
  const v = rows?.[0];
  if (v && typeof v === "object") {
    const k = Object.keys(v)[0];
    return Number(v[k]);
  }
  return 0;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log(JSON.stringify({ error: "DATABASE_URL not set (no .env?)" }, null, 2));
    process.exit(1);
  }

  const uploadDirWeb = path.resolve(
    path.join(process.cwd(), "..", "freezone-web", "public", "uploads"),
  );
  const uploadDirApi = path.join(process.cwd(), "public", "uploads");
  function listUploadNames(dir) {
    try {
      return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name !== ".gitkeep")
        .map((d) => d.name);
    } catch {
      return [];
    }
  }
  const diskFilesWeb = listUploadNames(uploadDirWeb);
  const diskFilesApi = listUploadNames(uploadDirApi);

  const counts = {};

  counts.productImage = await scalar(
    `SELECT COUNT(*)::int AS c FROM "ProductImage" WHERE url LIKE '%/uploads/%'`,
  );
  counts.productImageExactPath = await scalar(
    `SELECT COUNT(*)::int AS c FROM "ProductImage" WHERE url LIKE '/uploads/%'`,
  );

  counts.heroSlide = await scalar(
    `SELECT COUNT(*)::int AS c FROM "HeroSlide" WHERE "imageUrl" LIKE '%/uploads/%'`,
  );

  counts.promoBanner = await scalar(
    `SELECT COUNT(*)::int AS c FROM "PromoBanner" WHERE "imageUrl" LIKE '%/uploads/%'`,
  );

  counts.categoryBg = await scalar(
    `SELECT COUNT(*)::int AS c FROM "Category" WHERE "backgroundImageUrl" LIKE '%/uploads/%'`,
  );

  counts.brandLogo = await scalar(
    `SELECT COUNT(*)::int AS c FROM "Brand" WHERE "logoUrl" LIKE '%/uploads/%'`,
  );

  counts.siteConfigLogo = await scalar(
    `SELECT COUNT(*)::int AS c FROM "SiteConfig" WHERE "logoUrl" LIKE '%/uploads/%'`,
  );

  counts.homeSpotlight = await scalar(
    `SELECT COUNT(*)::int AS c FROM "HomeSpotlightItem" WHERE "imageUrl" LIKE '%/uploads/%'`,
  );

  counts.showroomMedia = await scalar(
    `SELECT COUNT(*)::int AS c FROM "ShowroomMedia" WHERE url LIKE '%/uploads/%'`,
  );

  counts.mediaAsset = await scalar(
    `SELECT COUNT(*)::int AS c FROM "MediaAsset" WHERE url LIKE '%/uploads/%'`,
  );

  counts.orderLineSnapshot = await scalar(
    `SELECT COUNT(*)::int AS c FROM "OrderLineItem" WHERE "imageSnapshot" LIKE '%/uploads/%'`,
  );

  counts.cmsDraft = await scalar(
    `SELECT COUNT(*)::int AS c FROM "CmsPageSection" WHERE "draftPayload"::text LIKE '%/uploads/%'`,
  );
  counts.cmsPublished = await scalar(
    `SELECT COUNT(*)::int AS c FROM "CmsPageSection" WHERE "publishedPayload"::text LIKE '%/uploads/%'`,
  );

  counts.siteConfigJson = await scalar(
    `SELECT COUNT(*)::int AS c FROM "SiteConfig" WHERE COALESCE("navItemsJson"::text,'') || COALESCE("themeTokens"::text,'') || COALESCE("homePageCopyJson"::text,'') LIKE '%/uploads/%'`,
  );

  const rowRefs = await prisma.$queryRawUnsafe(`
    SELECT url FROM "ProductImage" WHERE url LIKE '%/uploads/%'
    UNION SELECT "imageUrl" AS url FROM "HeroSlide" WHERE "imageUrl" LIKE '%/uploads/%'
    UNION SELECT "imageUrl" AS url FROM "PromoBanner" WHERE "imageUrl" LIKE '%/uploads/%'
    UNION SELECT "backgroundImageUrl" AS url FROM "Category" WHERE "backgroundImageUrl" LIKE '%/uploads/%'
    UNION SELECT "logoUrl" AS url FROM "Brand" WHERE "logoUrl" LIKE '%/uploads/%'
    UNION SELECT "logoUrl" AS url FROM "SiteConfig" WHERE "logoUrl" LIKE '%/uploads/%'
    UNION SELECT "imageUrl" AS url FROM "HomeSpotlightItem" WHERE "imageUrl" LIKE '%/uploads/%'
    UNION SELECT url FROM "ShowroomMedia" WHERE url LIKE '%/uploads/%'
    UNION SELECT url FROM "MediaAsset" WHERE url LIKE '%/uploads/%'
  `);

  const urls = rowRefs.map((r) => r.url).filter(Boolean);
  const filenamesFromUrls = new Set();
  for (const u of urls) {
    const m = String(u).match(/\/uploads\/([^/?#]+)$/);
    if (m) filenamesFromUrls.add(m[1]);
  }

  const ws = new Set(diskFilesWeb);
  const as = new Set(diskFilesApi);
  const matchedOnWebDisk = [...filenamesFromUrls].filter((f) => ws.has(f));
  const matchedOnApiDisk = [...filenamesFromUrls].filter((f) => as.has(f));
  const matchedOnEitherDisk = [...filenamesFromUrls].filter((f) => ws.has(f) || as.has(f));
  const dbFilenamesNotOnEitherDisk = [...filenamesFromUrls].filter((f) => !ws.has(f) && !as.has(f));

  const auditTotal = await scalar(`SELECT COUNT(*)::int AS c FROM "AuditLog"`);
  const auditOldest = await prisma.$queryRawUnsafe(
    `SELECT MIN("createdAt") AS min, MAX("createdAt") AS max FROM "AuditLog"`,
  );
  const auditSamples = await prisma.$queryRawUnsafe(`
    SELECT action, entity, "entityId", "createdAt"
    FROM "AuditLog"
    WHERE action ILIKE '%hero%' OR action ILIKE '%banner%' OR action ILIKE '%cms%'
       OR action ILIKE '%upload%' OR action ILIKE '%media%'
       OR entity ILIKE '%Hero%' OR entity ILIKE '%Banner%' OR entity ILIKE '%Cms%'
       OR entity ILIKE '%Media%' OR entity ILIKE '%Product%'
    ORDER BY "createdAt" DESC
    LIMIT 25
  `);

  const auditUploadActions = await scalar(
    `SELECT COUNT(*)::int AS c FROM "AuditLog" WHERE action ILIKE '%upload%' OR action ILIKE '%media%' OR entity ILIKE '%Media%'`,
  );

  console.log(
    JSON.stringify(
      {
        diskUploadFileCountWeb: diskFilesWeb.length,
        diskUploadFileCountApi: diskFilesApi.length,
        diskUploadFileCount: diskFilesWeb.length,
        uploadDirsOverlapCount: [...diskFilesWeb].filter((f) => as.has(f)).length,
        counts,
        distinctFilenamesFromDbUrls: filenamesFromUrls.size,
        matchedFilenamesOnWebDisk: matchedOnWebDisk.length,
        matchedFilenamesOnApiDisk: matchedOnApiDisk.length,
        matchedFilenamesOnEitherDisk: matchedOnEitherDisk.length,
        examplesMatchedOnWebDisk: matchedOnWebDisk.slice(0, 15),
        examplesMatchedOnApiDisk: matchedOnApiDisk.slice(0, 15),
        examplesDbUrlsFilenameMissingOnWebOrApiDisk: dbFilenamesNotOnEitherDisk.slice(0, 15),
        onWebDiskNotInRowUnionSample: diskFilesWeb
          .filter((f) => !filenamesFromUrls.has(f))
          .slice(0, 15),
        auditLog: {
          total: auditTotal,
          minCreatedAt: auditOldest[0]?.min ?? null,
          maxCreatedAt: auditOldest[0]?.max ?? null,
          rowsMatchingHeroBannerCmsUploadMediaFilter: auditSamples.length,
          sampleActions: auditSamples,
          countUploadOrMediaLoose: auditUploadActions,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.log(JSON.stringify({ error: String(e.message || e) }, null, 2));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
