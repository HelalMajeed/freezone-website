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

function getApiPort() {
  const m = getMergedEnv();
  const p = m.API_PORT || "4000";
  const n = parseInt(String(p), 10);
  return Number.isFinite(n) && n > 0 ? n : 4000;
}

module.exports = {
  webRoot,
  apiRoot,
  loadEnvFile,
  getMergedEnv,
  getDatabaseUrl,
  getApiPort,
};
