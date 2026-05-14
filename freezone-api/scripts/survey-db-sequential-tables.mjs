#!/usr/bin/env node
/**
 * Read-only: connect with DATABASE_URL from an .env file and COUNT each table sequentially.
 * Survives partial GRANT failures (unlike Promise.all on Prisma model counts).
 *
 * Usage: node scripts/survey-db-sequential-tables.mjs path/to/.env
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const tables = [
  "Product",
  "Category",
  "Brand",
  "Order",
  "ProductImage",
  "AuditLog",
  "CmsPage",
  "CmsPageSection",
  "SiteConfig",
  "HeroSlide",
  "HomeSpotlightItem",
  "MediaAsset",
  "Coupon",
  "ProductVariant",
  "ProductSecondaryCategory",
];

function loadEnvFile(p) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) throw new Error(`missing ${abs}`);
  const txt = fs.readFileSync(abs, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v) return v;
  }
  throw new Error("no DATABASE_URL in file");
}

const envFile = process.argv[2];
if (!envFile) {
  console.error("Usage: node scripts/survey-db-sequential-tables.mjs <path-to-.env>");
  process.exit(1);
}
delete process.env.DATABASE_URL;
process.env.DATABASE_URL = loadEnvFile(envFile);

const prisma = new PrismaClient();
const out = { tables: {}, meta: {} };
try {
  const rows = await prisma.$queryRaw`SELECT current_database() AS db, current_user AS role`;
  out.meta = rows[0] ?? {};
} catch (e) {
  out.meta = { connectError: String(e?.message ?? e) };
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

for (const t of tables) {
  try {
    const r = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::bigint AS c FROM "${t}"`);
    out.tables[t] = Number(r[0]?.c ?? 0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = e && typeof e === "object" && "code" in e ? e.code : undefined;
    out.tables[t] = { error: msg || e?.toString?.() || "unknown_error", code };
  }
}

console.log(JSON.stringify(out, null, 2));
await prisma.$disconnect();
