/**
 * Shared env guard for classification maintenance scripts.
 * Loads only freezone-api/.env — never .env.example.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const API_ENV_PATH = path.join(scriptsDir, "..", ".env");

export function loadClassificationScriptEnv(): string {
  const loaded = dotenv.config({ path: API_ENV_PATH });
  if (loaded.error && (loaded.error as NodeJS.ErrnoException).code !== "ENOENT") {
    console.warn(`[env] Could not read ${API_ENV_PATH}: ${loaded.error.message}`);
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("\nERROR: DATABASE_URL is not set.\n");
    console.error("1. Create freezone-api/.env (never commit it).");
    console.error("2. Add: DATABASE_URL=postgresql://user:pass@host:5432/dbname");
    console.error("3. Use your real Fly/Neon URL for production data — not .env.example.\n");
    console.error("Then run:");
    console.error("  npm run classification:seed");
    console.error("  npm run classification:sync-legacy");
    console.error("  npx tsx scripts/sync-legacy-product-specs.ts --dry-run\n");
    process.exit(1);
  }

  if (looksLikeLocalDatabase(url)) {
    console.warn("\nWARNING: DATABASE_URL appears to target a local database:");
    console.warn(`  ${maskDatabaseUrl(url)}`);
    console.warn("If you intended production, set the Fly/Neon URL in freezone-api/.env.\n");
  }

  return url;
}

export function parseClassificationScriptArgs(argv: string[]): { dryRun: boolean } {
  return { dryRun: argv.includes("--dry-run") };
}

function looksLikeLocalDatabase(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/** Redact credentials from URL for logs. */
export function maskDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    const user = u.username ? `${u.username}@` : "";
    const port = u.port ? `:${u.port}` : "";
    return `${u.protocol}//${user}${u.hostname}${port}${u.pathname}`;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}
