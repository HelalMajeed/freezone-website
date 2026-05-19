/**
 * Full classification sync: category attribute presets + legacy product specs → EAV.
 * Run: npx tsx scripts/sync-all-classification.ts
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(script: string) {
  console.log(`\n==> ${script}`);
  execSync(`npx tsx scripts/${script}`, { cwd: root, stdio: "inherit" });
}

run("seed-classification-only.ts");
run("sync-legacy-product-specs.ts");
console.log("\n==> classification sync complete");
