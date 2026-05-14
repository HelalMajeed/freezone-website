#!/usr/bin/env node
/**
 * Walk Desktop/Documents/Downloads for .env* files, run redact + read-only Prisma survey per file.
 * Writes JSON lines to stdout (paths only; metadata redacted). No DB writes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const roots = [
  path.join(process.env.USERPROFILE || "", "Desktop"),
  path.join(process.env.USERPROFILE || "", "Documents"),
  path.join(process.env.USERPROFILE || "", "Downloads"),
];
const envBasenames = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.backup",
  ".env.old",
  ".env.development",
]);

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const redactScript = path.join(scriptsDir, "redact-env-database-meta.mjs");
const surveyScript = path.join(scriptsDir, "survey-db-extended.mjs");

function priorityScore(p) {
  const s = p.toLowerCase();
  let n = 0;
  if (s.includes("freezone")) n += 20;
  if (s.includes("freezone-store") || s.includes("fzone-store")) n += 25;
  if (s.includes("freezone-fixed")) n += 25;
  if (s.includes("abd almonam")) n += 15;
  if (s.includes("website") && s.includes("backend")) n += 15;
  return n;
}

function walk(dir, depth, maxDepth, out) {
  if (depth > maxDepth) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full, depth + 1, maxDepth, out);
    } else if (ent.isFile() && envBasenames.has(ent.name)) {
      out.push(full);
    }
  }
}

const found = [];
for (const r of roots) {
  if (fs.existsSync(r)) walk(r, 0, 6, found);
}
const unique = [...new Set(found)].sort((a, b) => {
  const pa = priorityScore(a);
  const pb = priorityScore(b);
  if (pb !== pa) return pb - pa;
  return a.localeCompare(b);
});

function runNode(script, arg, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  delete env.DATABASE_URL;
  const r = spawnSync(process.execPath, [script, arg], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    env,
    cwd: path.join(scriptsDir, ".."),
  });
  return { status: r.status ?? 1, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function parseJsonLoose(s) {
  const t = s.trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

for (const envPath of unique) {
  const metaRun = runNode(redactScript, envPath);
  let meta;
  try {
    meta = JSON.parse(metaRun.stdout.trim().split("\n").filter(Boolean).at(-1) || "{}");
  } catch {
    meta = { parseError: true, raw: metaRun.stdout.slice(0, 200) };
  }

  const row = {
    envPath,
    meta,
    survey: null,
    surveyError: null,
  };

  if (!meta.present) {
    console.log(JSON.stringify(row));
    continue;
  }

  const su = runNode(surveyScript, envPath);
  const out = `${su.stdout || ""}${su.stderr || ""}`.trim();
  const j = parseJsonLoose(out);
  if (!j) {
    row.surveyError = out.slice(0, 500).replace(/postgresql:\/\/[^\s"'<>]+/gi, "postgresql://***:***@***/***");
  } else if (j.error) {
    row.surveyError = String(j.error).replace(/postgresql:\/\/[^\s"'<>]+/gi, "postgresql://***:***@***/***");
  } else if (typeof j.products === "number") {
    row.survey = j;
  } else {
    row.surveyError = out.slice(0, 500).replace(/postgresql:\/\/[^\s"'<>]+/gi, "postgresql://***:***@***/***");
  }
  console.log(JSON.stringify(row));
}
