#!/usr/bin/env node
/** Print DATABASE_URL host/port/db/user only (no password). Default: repo freezone-api/.env and freezone-web/.env */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");

function metaFromEnvFile(rel) {
  const file = path.isAbsolute(rel) ? rel : path.join(repoRoot, rel);
  try {
    const raw = fs.readFileSync(file, "utf8");
    const m = raw.match(/^DATABASE_URL=(.+)$/m);
    if (!m) return { file: rel, error: "no DATABASE_URL line" };
    let u = m[1].trim();
    if ((u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'"))) u = u.slice(1, -1);
    const x = new URL(u);
    const host = x.hostname;
    let provider = "other";
    if (host === "127.0.0.1" || host === "localhost") provider = "local";
    if (/neon\.tech$/i.test(host) || host.includes("neon")) provider = "neon";
    if (host.includes("supabase")) provider = "supabase";
    if (host.includes("amazonaws.com") || host.includes("rds")) provider = "rds_or_aws";
    return {
      file: rel,
      host,
      port: x.port || "5432",
      database: x.pathname.replace(/^\//, "") || "(default)",
      user: x.username || "(empty)",
      hasPassword: Boolean(x.password),
      providerGuess: provider,
    };
  } catch (e) {
    return { file: rel, error: String(e?.message ?? e) };
  }
}

const paths =
  process.argv.slice(2).length > 0 ? process.argv.slice(2) : ["freezone-api/.env", "freezone-web/.env"];
console.log(JSON.stringify(paths.map((p) => metaFromEnvFile(p)), null, 2));
