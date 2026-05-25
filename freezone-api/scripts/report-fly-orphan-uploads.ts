/**
 * Report orphan image files on Fly volume (not referenced in DB).
 * Dry-run only — does not delete files.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/report-fly-orphan-uploads.Ts
 *   npx tsx scripts/report-fly-orphan-uploads.ts --local-only
 */
import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.join(process.cwd(), "..", "freezone-web", ".env") });

const prisma = new PrismaClient();
const logsDir = path.join(process.cwd(), "logs");
const app = process.env.FLY_APP ?? "freezone-website";
const localOnly = process.argv.includes("--local-only");

async function* walkFiles(dir: string, base = dir): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkFiles(full, base);
    else if (e.isFile()) {
      const rel = path.relative(base, full).replace(/\\/g, "/");
      yield `/uploads/products/${rel.replace(/^products\/?/, "")}`;
    }
  }
}

async function listFlyVolumeFiles(): Promise<string[]> {
  const r = spawnSync(
    "flyctl",
    [
      "ssh",
      "console",
      "-a",
      app,
      "-C",
      "sh -lc 'find /app/public/uploads/products -type f 2>/dev/null | sed \"s|^/app/public||\"'",
    ],
    { encoding: "utf8", shell: true },
  );
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || "fly ssh failed");
  }
  return r.stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("/uploads/"));
}

async function main() {
  const dbUrls = new Set(
    (
      await prisma.productImage.findMany({
        select: { url: true },
      })
    ).map((r) => r.url),
  );

  let volumeFiles: string[] = [];
  let source: "fly" | "local" = "fly";

  if (localOnly) {
    const localRoot = path.join(process.cwd(), "public", "uploads", "products");
    if (existsSync(localRoot)) {
      for await (const u of walkFiles(localRoot, localRoot)) volumeFiles.push(u);
    }
    source = "local";
  } else {
    try {
      volumeFiles = await listFlyVolumeFiles();
    } catch (e) {
      console.warn("Fly listing failed, falling back to local disk:", e);
      const localRoot = path.join(process.cwd(), "public", "uploads", "products");
      if (existsSync(localRoot)) {
        for await (const u of walkFiles(localRoot, localRoot)) volumeFiles.push(u);
      }
      source = "local";
    }
  }

  const orphans = volumeFiles.filter((f) => !dbUrls.has(f));
  const missingInVolume = [...dbUrls].filter(
    (u) => u.startsWith("/uploads/products/") && !volumeFiles.includes(u),
  );

  const giOrphans = orphans.filter((f) => /\/gi-\d+-/.test(f));

  const report = {
    mode: "dry_run",
    source,
    started_at: new Date().toISOString(),
    db_image_urls: dbUrls.size,
    volume_files: volumeFiles.length,
    orphan_files: orphans.length,
    orphan_gi_pattern: giOrphans.length,
    missing_in_volume: missingInVolume.length,
    sample_orphans: orphans.slice(0, 30),
    sample_missing: missingInVolume.slice(0, 20),
    note: "No files deleted. Review before any cleanup on Fly volume.",
  };

  await mkdir(logsDir, { recursive: true });
  const out = path.join(logsDir, "globaliraq-orphan-uploads-report.json");
  await writeFile(out, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nReport: ${out}`);
}

main()
  .finally(() => prisma.$disconnect());
