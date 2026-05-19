/**
 * Full classification sync: category attribute presets + legacy product specs → EAV.
 * Does NOT run prisma db seed. Requires DATABASE_URL in freezone-api/.env
 *
 * Prefer: npm run classification:repair
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadClassificationScriptEnv } from "./classification-script-env";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

loadClassificationScriptEnv();

function run(script: string) {
  console.log(`\n==> ${script}`);
  execSync(`npx tsx scripts/${script}`, { cwd: root, stdio: "inherit", env: process.env });
}

run("seed-classification-only.ts");
run("sync-legacy-product-specs.ts");
console.log("\n==> classification sync complete (products not deleted)");
