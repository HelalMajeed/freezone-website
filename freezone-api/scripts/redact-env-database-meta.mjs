#!/usr/bin/env node
/**
 * Read DATABASE_URL from a dotenv-style file; print redacted JSON (no password).
 * Usage: node scripts/redact-env-database-meta.mjs <path-to-.env>
 */
import fs from "node:fs";
import path from "node:path";

function extractDatabaseUrl(txt) {
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v) return v;
  }
  return null;
}

function redactMetadata(urlStr) {
  const raw = String(urlStr).trim();
  if (!raw) return { present: false };
  const proto = raw.startsWith("postgresql://") ? "postgresql" : raw.startsWith("postgres://") ? "postgres" : "other";
  try {
    const normalized = raw.replace(/^postgres(ql)?:\/\//i, "http://");
    const u = new URL(normalized);
    const db = (u.pathname || "/").replace(/^\//, "").split("?")[0] || "(none)";
    const host = u.hostname || "(none)";
    const port = u.port || (proto !== "other" ? "5432" : "");
    const user = u.username ? `${u.username}:***` : undefined;
    let providerGuess = "custom/self-hosted";
    const h = host.toLowerCase();
    if (h.includes("neon.tech")) providerGuess = "neon";
    else if (h.includes("supabase.co")) providerGuess = "supabase";
    else if (h.includes("railway.app")) providerGuess = "railway";
    else if (h.includes("render.com")) providerGuess = "render";
    else if (h.includes("fly.dev") || h.endsWith(".internal")) providerGuess = "fly";
    else if (h === "127.0.0.1" || h === "localhost") providerGuess = "local";
    return { present: true, scheme: proto, host, port, database: db, user, providerGuess };
  } catch {
    return { present: true, scheme: proto, parseError: true };
  }
}

const p = process.argv[2];
if (!p) {
  console.error("Usage: node redact-env-database-meta.mjs <path-to-env-file>");
  process.exit(1);
}
const abs = path.resolve(p);
if (!fs.existsSync(abs)) {
  console.log(JSON.stringify({ path: abs, error: "file_not_found" }));
  process.exit(0);
}
const txt = fs.readFileSync(abs, "utf8");
const url = extractDatabaseUrl(txt);
if (!url) {
  console.log(JSON.stringify({ path: abs, present: false, reason: "no_DATABASE_URL_line" }));
  process.exit(0);
}
console.log(JSON.stringify({ path: abs, ...redactMetadata(url) }));
