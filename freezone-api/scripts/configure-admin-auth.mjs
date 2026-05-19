#!/usr/bin/env node
/**
 * Switch admin login from "direct" (no password) to password-protected.
 *
 * The API reads:
 *   ADMIN_REQUIRE_PASSWORD=true  → POST /api/admin/login must send the correct ADMIN_PASSWORD
 *   ADMIN_PASSWORD                 → admin password (keep secret)
 *   ADMIN_SESSION_SECRET           → HMAC key for session cookies (rotate with password)
 *
 * Usage:
 *   node scripts/configure-admin-auth.mjs
 *       Print generated values + Fly command (does not change anything).
 *
 *   node scripts/configure-admin-auth.mjs --apply-fly --app freezone-website
 *       Run `flyctl secrets set` on the given Fly app (requires flyctl + login).
 *
 * Local dev: copy the printed lines into freezone-api/.env (and match in freezone-web/.env if you use a shared file).
 */

import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const applyFly = argv.includes("--apply-fly");
const appIdx = argv.indexOf("--app");
const app = appIdx >= 0 && argv[appIdx + 1] ? argv[appIdx + 1] : process.env.FLY_APP || "freezone-website";

function genPassword(len = 24) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const b = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[b[i] % chars.length];
  return out;
}

const adminPassword = genPassword(24);
const adminSessionSecret = randomBytes(32).toString("hex");

if (!applyFly) {
  console.log("=== Admin password login (copy into freezone-api/.env for local) ===\n");
  console.log("ADMIN_REQUIRE_PASSWORD=true");
  console.log(`ADMIN_PASSWORD=${adminPassword}`);
  console.log(`ADMIN_SESSION_SECRET=${adminSessionSecret}`);
  console.log("\nPut these in freezone-api/.env for local dev, then restart the API.");
  console.log("The admin UI reads /api/admin/login from the API — no ADMIN_PASSWORD copy is needed in freezone-web.");
  console.log("Open /admin/login — you should see the password field.\n");
  console.log("--- Fly.io (production) ---\n");
  console.log(`  node scripts/configure-admin-auth.mjs --apply-fly --app ${app}\n`);
  process.exit(0);
}

const fly = process.env.FLYCTL || "flyctl";
const args = [
  "secrets",
  "set",
  "ADMIN_REQUIRE_PASSWORD=true",
  `ADMIN_PASSWORD=${adminPassword}`,
  `ADMIN_SESSION_SECRET=${adminSessionSecret}`,
  "ADMIN_SESSION_SAMESITE=none",
  "-a",
  app,
];

console.log(`Applying secrets to Fly app: ${app} …\n`);
const r = spawnSync(fly, args, { stdio: "inherit", shell: false });
if (r.status !== 0) {
  console.error("\nflyctl failed. Install Fly CLI and run `flyctl auth login`, then retry.");
  process.exit(r.status ?? 1);
}

console.log("\n=== Save this password somewhere safe (shown once) ===");
console.log(adminPassword);
console.log("\nRedeploy or restart the app machine so running instances reload secrets:");
console.log(`  flyctl deploy -a ${app}`);
console.log(`  # or: flyctl machines restart -a ${app}\n`);
