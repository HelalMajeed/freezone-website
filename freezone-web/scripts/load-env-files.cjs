/**
 * Shared helpers for dev bootstrap scripts (CommonJS).
 */
const fs = require("fs");
const path = require("path");

const webRoot = path.join(__dirname, "..");
const apiRoot = path.join(webRoot, "..", "freezone-api");

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

/** Prefer process.env, then web .env, then api .env */
function getMergedEnv() {
  const webEnv = loadEnvFile(path.join(webRoot, ".env"));
  const apiEnv = loadEnvFile(path.join(apiRoot, ".env"));
  return { ...webEnv, ...apiEnv, ...process.env };
}

function getDatabaseUrl() {
  const m = getMergedEnv();
  return String(m.DATABASE_URL || "").trim();
}

/** API port for dev scripts — prefer explicit shell, then api/.env (source of truth), then web/.env fallback. */
function getApiPort() {
  const webEnv = loadEnvFile(path.join(webRoot, ".env"));
  const apiEnv = loadEnvFile(path.join(apiRoot, ".env"));

  const tryPort = (raw) => {
    const n = parseInt(String(raw ?? "").trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  return (
    tryPort(process.env.API_PORT) ??
    tryPort(apiEnv.API_PORT) ??
    tryPort(webEnv.API_PORT) ??
    4000
  );
}

/** Vite dev server port (see vite.config.ts). */
function getViteDevPort() {
  const m = getMergedEnv();
  const p = m.VITE_DEV_PORT || "3000";
  const n = parseInt(String(p), 10);
  return Number.isFinite(n) && n > 0 ? n : 3000;
}

module.exports = {
  webRoot,
  apiRoot,
  loadEnvFile,
  getMergedEnv,
  getDatabaseUrl,
  getApiPort,
  getViteDevPort,
};
