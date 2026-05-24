// In-memory sliding-window rate limiter for high-frequency public endpoints.
//
// We deliberately keep this dependency-free + in-memory: the API runs on a
// single Fly machine (auto_stop=stop, single replica), so a per-process store
// is consistent for all callers. If we ever scale to >1 machine we should
// swap this for a Redis-backed implementation behind the same interface.
//
// The window is sliding — every request records its timestamp, anything older
// than `windowMs` is pruned before the new request is counted. Bursts that
// just stayed under the limit are correctly throttled the moment a previous
// request rolls out of the window.

interface Bucket {
  /** Sorted ascending. */
  timestamps: number[];
}

interface Rule {
  limit: number;
  windowMs: number;
  buckets: Map<string, Bucket>;
}

const rules = new Map<string, Rule>();
/** Belt-and-braces sweep: every 5 min drop buckets that have not been touched. */
let sweepInterval: NodeJS.Timeout | null = null;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function ensureSweep() {
  if (sweepInterval) return;
  sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const rule of rules.values()) {
      for (const [key, bucket] of rule.buckets) {
        bucket.timestamps = bucket.timestamps.filter((t) => now - t < rule.windowMs);
        if (bucket.timestamps.length === 0) rule.buckets.delete(key);
      }
    }
  }, SWEEP_INTERVAL_MS);
  /** Don't let the interval keep the process alive on tests. */
  sweepInterval.unref?.();
}

export interface RateLimitDecision {
  ok: boolean;
  retryAfterMs?: number;
  remaining: number;
}

/**
 * Check the rate limit for the `(scope, key)` pair, recording this request
 * if it is allowed. `scope` identifies the endpoint (e.g. `public/orders`);
 * `key` is per-caller (usually IP).
 */
export function rateLimitCheck(
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
): RateLimitDecision {
  ensureSweep();
  let rule = rules.get(scope);
  if (!rule || rule.limit !== limit || rule.windowMs !== windowMs) {
    rule = { limit, windowMs, buckets: new Map() };
    rules.set(scope, rule);
  }
  const now = Date.now();
  let bucket = rule.buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    rule.buckets.set(key, bucket);
  }
  /** Drop expired entries from the head. timestamps is sorted ascending so
   *  this is O(k) where k is the number of expired entries. */
  while (bucket.timestamps.length > 0 && now - bucket.timestamps[0] >= windowMs) {
    bucket.timestamps.shift();
  }
  if (bucket.timestamps.length >= limit) {
    const retryAfterMs = Math.max(1, windowMs - (now - bucket.timestamps[0]));
    return { ok: false, retryAfterMs, remaining: 0 };
  }
  bucket.timestamps.push(now);
  return { ok: true, remaining: Math.max(0, limit - bucket.timestamps.length) };
}

/**
 * Pull the caller IP from an Express-style request. Trust the first
 * `x-forwarded-for` entry only when `trust proxy` is on (Fly sets this).
 * Falls back to the socket remote address.
 */
export function ipKeyFromExpressReq(req: {
  ip?: string;
  ips?: string[];
  socket?: { remoteAddress?: string };
}): string {
  if (req.ip) return req.ip;
  if (req.ips && req.ips.length > 0) return req.ips[0];
  return req.socket?.remoteAddress ?? "unknown";
}

/** Reset all in-memory rules — handy for tests. */
export function resetRateLimitStore(): void {
  rules.clear();
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
}
