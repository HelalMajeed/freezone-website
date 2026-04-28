/**
 * Ensures env files exist for first-time clone:
 * - freezone-web/.env from .env.example
 * - freezone-api/.env from .env.example (and DATABASE_URL copied from web when both are new)
 * شغّل: npm run env:init
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");
const apiRoot = path.join(root, "..", "freezone-api");
const apiEnvPath = path.join(apiRoot, ".env");
const apiExamplePath = path.join(apiRoot, ".env.example");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function setDatabaseUrlInRaw(raw, databaseUrl) {
  const escaped = String(databaseUrl).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const line = `DATABASE_URL="${escaped}"`;
  if (/^DATABASE_URL\s*=/m.test(raw)) {
    return raw.replace(/^DATABASE_URL\s*=\s*.*/m, line);
  }
  return `${line}\n${raw}`;
}

// --- freezone-web/.env
if (!fs.existsSync(examplePath)) {
  console.warn("[env:init] freezone-web/.env.example missing — skip web .env.");
} else if (!fs.existsSync(envPath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log("[env:init] Created freezone-web/.env from .env.example.");
} else {
  console.log("[env:init] freezone-web/.env already present.");
}

const webEnv = loadEnvFile(envPath);

// --- freezone-api/.env (API must read DATABASE_URL; first run often missing this file)
if (!fs.existsSync(apiExamplePath)) {
  console.warn("[env:init] freezone-api/.env.example missing — skip api .env.");
} else if (!fs.existsSync(apiEnvPath)) {
  fs.copyFileSync(apiExamplePath, apiEnvPath);
  console.log("[env:init] Created freezone-api/.env from freezone-api/.env.example.");
  let raw = fs.readFileSync(apiEnvPath, "utf8");
  if (webEnv.DATABASE_URL) {
    raw = setDatabaseUrlInRaw(raw, webEnv.DATABASE_URL);
    fs.writeFileSync(apiEnvPath, raw);
    console.log("[env:init] Set freezone-api/.env DATABASE_URL from freezone-web/.env");
  }
} else {
  console.log("[env:init] freezone-api/.env already present (not overwriting).");
}

console.log(
  "[env:init] Done. If DATABASE_URL differs between apps, keep freezone-web/.env and freezone-api/.env in sync.",
);
process.exit(0);
