/**
 * One-time: sync Category.facetKeys → CategoryAttribute and Product.specs → ProductAttributeValue.
 * Prefer: npx tsx scripts/sync-all-classification.ts
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
execSync("npx tsx scripts/sync-all-classification.ts", { cwd: root, stdio: "inherit" });
