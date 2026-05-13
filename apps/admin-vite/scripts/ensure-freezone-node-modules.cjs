/**
 * When `tsc` typechecks files under `../../freezone-web/src`, Node-style resolution looks for
 * `node_modules` next to those files (i.e. `freezone-web/node_modules`), not under `apps/admin-vite`.
 * Netlify only runs `npm install` in `apps/admin-vite`, so we link `freezone-web/node_modules` to this
 * package's `node_modules` when the former is missing. Skip if `freezone-web` already has a real install.
 */
const fs = require("node:fs");
const path = require("node:path");

const adminRoot = path.resolve(__dirname, "..");
const adminModules = path.join(adminRoot, "node_modules");
const freezoneRoot = path.resolve(adminRoot, "..", "..", "freezone-web");
const freezoneModules = path.join(freezoneRoot, "node_modules");

function main() {
  if (!fs.existsSync(adminModules)) {
    console.warn("[ensure-freezone-node-modules] skip: apps/admin-vite/node_modules missing");
    return;
  }
  if (!fs.existsSync(freezoneRoot)) {
    console.warn("[ensure-freezone-node-modules] skip: freezone-web directory missing");
    return;
  }
  if (fs.existsSync(freezoneModules)) {
    let stat;
    try {
      stat = fs.lstatSync(freezoneModules);
    } catch {
      return;
    }
    if (stat.isSymbolicLink()) {
      return;
    }
    // Real directory (local dev ran npm install in freezone-web) — do not replace.
    return;
  }

  const target = path.relative(path.dirname(freezoneModules), adminModules);
  fs.symlinkSync(target, freezoneModules, "dir");
  console.log(`[ensure-freezone-node-modules] linked ${freezoneModules} -> ${target}`);
}

main();
