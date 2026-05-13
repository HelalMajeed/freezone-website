/**
 * When Netlify (or CI) runs `npm install` only under `apps/admin-vite`, TypeScript still
 * typechecks files under `../../freezone-web/src`. Node-style resolution walks from that file
 * path and expects `freezone-web/node_modules` — so install freezone-web deps here (including
 * devDependencies for `@types/*` and Vitest-excluding test files via tsconfig exclude).
 *
 * Skip: SKIP_FREEZONE_WEB_INSTALL=1
 */
const { execSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

if (process.env.SKIP_FREEZONE_WEB_INSTALL === "1") {
  process.exit(0);
}

const freezoneRoot = path.join(__dirname, "..", "..", "..", "freezone-web");
const pkg = path.join(freezoneRoot, "package.json");
if (!existsSync(pkg)) {
  console.warn("[ensure-freezone-web-deps] freezone-web not found at", freezoneRoot);
  process.exit(0);
}

execSync("npm install --no-audit --no-fund", {
  cwd: freezoneRoot,
  stdio: "inherit",
  env: process.env,
});
