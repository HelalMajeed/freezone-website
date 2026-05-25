/**
 * Repair missing Global Iraq import items (images/specs/variants/products).
 * Re-runs import with --update for all products, then verify.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const DEFAULT_EXPORT =
  process.platform === "win32"
    ? "C:\\Users\\Helal\\Downloads\\GlobalIraq_COMPLETE_Recovery_Export"
    : path.join(process.env.HOME ?? "", "Downloads", "GlobalIraq_COMPLETE_Recovery_Export");

const exportDir = process.argv.includes("--export-dir")
  ? process.argv[process.argv.indexOf("--export-dir") + 1]
  : DEFAULT_EXPORT;

console.log("Global Iraq repair — re-import with --update");
const imp = spawnSync(
  "npx",
  ["tsx", "scripts/import-globaliraq-products.ts", "--update", "--export-dir", exportDir],
  { cwd: process.cwd(), stdio: "inherit", shell: true, env: process.env },
);
if (imp.status !== 0) process.exit(imp.status ?? 1);

console.log("\nRepair verification…");
const ver = spawnSync(
  "npx",
  ["tsx", "scripts/verify-globaliraq-import.ts", "--export-dir", exportDir],
  { cwd: process.cwd(), stdio: "inherit", shell: true, env: process.env },
);
process.exit(ver.status ?? 0);
