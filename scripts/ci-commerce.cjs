/**
 * Cross-platform commerce-suite build for `npm run ci:commerce`.
 * Sets NEXT_PUBLIC_API_URL for Next.js build when unset.
 */
const { execSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");
const adminApi = path.join(root, "commerce-suite", "admin-api");
const adminWeb = path.join(root, "commerce-suite", "admin-web");
const adminVite = path.join(root, "apps", "admin-vite");

function run(cmd, cwd, env = process.env) {
  execSync(cmd, { cwd, stdio: "inherit", env });
}

// `npm ci` deletes node_modules first; on Windows the Prisma query-engine DLL is often
// still locked (dev server, AV), causing EPERM. `npm install` avoids that full wipe.
run("npm install", adminApi);
run("npm run prisma:generate", adminApi);
run("npm run build", adminApi);

const webEnv = {
  ...process.env,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3020/v1",
};
run("npm install", adminWeb, webEnv);
run("npm run build", adminWeb, webEnv);

const viteEnv = {
  ...process.env,
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || "http://127.0.0.1:3020/v1",
};
run("npm install", adminVite, viteEnv);
run("npm run lint", adminVite, viteEnv);
run("npm run typecheck", adminVite, viteEnv);
run("npm run build", adminVite, viteEnv);
