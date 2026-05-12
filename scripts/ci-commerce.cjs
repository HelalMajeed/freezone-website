/**
 * Cross-platform commerce-suite build for `npm run ci:commerce`.
 * Sets NEXT_PUBLIC_API_URL for Next.js build when unset.
 */
const { execSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");
const adminApi = path.join(root, "commerce-suite", "admin-api");
const adminWeb = path.join(root, "commerce-suite", "admin-web");

function run(cmd, cwd, env = process.env) {
  execSync(cmd, { cwd, stdio: "inherit", env });
}

run("npm ci", adminApi);
run("npm run prisma:generate", adminApi);
run("npm run build", adminApi);

const webEnv = {
  ...process.env,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3020/v1",
};
run("npm ci", adminWeb, webEnv);
run("npm run build", adminWeb, webEnv);
