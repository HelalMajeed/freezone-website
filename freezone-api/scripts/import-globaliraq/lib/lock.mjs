// Two-layer concurrency guard so we never run two importers at once:
//   1. A local .lock file with the current pid/hostname (catches local rerun mistakes).
//   2. The ImportBatch row in the target DB carries `lockOwner` + `status='running'`
//      so a colleague on another machine can't stomp on us either.
//
// The DB layer only kicks in when the importer is given a Prisma client. The
// scrape-only paths (discover.mjs, scrape-product.mjs) use the local lock only.

import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";

export const DEFAULT_LOCK_PATH = resolve(import.meta.dirname, "..", "data", "import.lock");

export function acquireLocalLock(lockPath = DEFAULT_LOCK_PATH) {
  mkdirSync(dirname(lockPath), { recursive: true });
  if (existsSync(lockPath)) {
    const owner = safeRead(lockPath);
    if (owner && isPidAlive(owner.pid)) {
      throw new LockedError(`Local lock at ${lockPath} held by ${owner.host}:${owner.pid} since ${owner.ts}`);
    }
    /** Stale lock from a crashed run — clear it so we can move on. */
    try { unlinkSync(lockPath); } catch { /* race; ignore */ }
  }
  const owner = { host: hostname(), pid: process.pid, ts: new Date().toISOString() };
  writeFileSync(lockPath, JSON.stringify(owner) + "\n", { encoding: "utf8" });
  return {
    owner,
    release() {
      try { unlinkSync(lockPath); } catch { /* already gone */ }
    },
  };
}

export class LockedError extends Error {
  constructor(msg) { super(msg); this.code = "EIMPORTLOCK"; }
}

function safeRead(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function isPidAlive(pid) {
  if (typeof pid !== "number") return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}
