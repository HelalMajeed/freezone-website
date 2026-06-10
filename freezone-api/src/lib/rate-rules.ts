/**
 * Rate-limit rule table + matcher for the Express middleware in server.ts.
 *
 * Rules are resolved in three tiers (first match wins):
 *  1. exact    — `METHOD /path` (case-insensitive, trailing slashes collapsed)
 *  2. pattern  — regex rules for parameterized paths (e.g. `/products/:id/reviews`)
 *  3. fallback — generous per-IP baseline on public/ssr GETs so scrapers cannot
 *                hammer the catalog endpoints unbounded; normal browsing (one
 *                bootstrap per locale + a handful of per-page fetches) stays
 *                far below the limit.
 */

export interface RateLimitRule {
  limit: number;
  windowMs: number;
  scope: string;
}

const EXACT_RULES: Record<string, RateLimitRule> = {
  "POST /api/public/orders":              { scope: "public/orders",          limit: 5,  windowMs: 60_000 },
  "POST /api/public/orders/track":        { scope: "public/order-track",     limit: 10, windowMs: 60_000 },
  "POST /api/public/contact":             { scope: "public/contact",         limit: 5,  windowMs: 60_000 },
  "POST /api/public/coupon/validate":     { scope: "public/coupon-validate", limit: 10, windowMs: 60_000 },
  "POST /api/pc-build":                   { scope: "public/pc-build",        limit: 10, windowMs: 60_000 },
  "POST /api/admin/login":                { scope: "admin/login",            limit: 5,  windowMs: 10 * 60_000 },
  "POST /api/dashboard/auth/login":       { scope: "dashboard/login",        limit: 5,  windowMs: 10 * 60_000 },
  "POST /api/dashboard/auth/direct-login":{ scope: "dashboard/direct-login", limit: 5,  windowMs: 10 * 60_000 },
  /** Customer accounts — same brute-force budget as the dashboard login. */
  "POST /api/public/auth/register":       { scope: "public/auth-register",   limit: 5,  windowMs: 10 * 60_000 },
  "POST /api/public/auth/login":          { scope: "public/auth-login",      limit: 5,  windowMs: 10 * 60_000 },
};

interface PatternRule extends RateLimitRule {
  method: string;
  /** Tested against the lower-cased, trailing-slash-collapsed path. */
  pattern: RegExp;
}

const PATTERN_RULES: PatternRule[] = [
  /** Customer review submission (POST /api/public/products/:id/reviews). */
  {
    method: "POST",
    pattern: /^\/api\/public\/products\/[^/]+\/reviews$/,
    scope: "public/product-reviews",
    limit: 5,
    windowMs: 60_000,
  },
];

/** Baseline for anonymous catalog browsing — applies to GET/HEAD only. */
const PUBLIC_GET_FALLBACK: RateLimitRule = {
  scope: "public/get-baseline",
  limit: 300,
  windowMs: 60_000,
};
const PUBLIC_GET_PREFIXES = ["/api/public/", "/api/ssr/"];

/**
 * Normalize "METHOD /path" so the limit lookup cannot be bypassed by case
 * (`/API/...`) or a trailing slash (`/api/public/contact/`). Express routing is
 * case-insensitive and non-strict by default, so those variants still reach the
 * same handler — the rate-limit key must collapse them the same way.
 */
function normalizePath(path: string): string {
  return (path.replace(/\/+$/, "") || "/").toLowerCase();
}

const NORMALIZED_EXACT_RULES = new Map<string, RateLimitRule>(
  Object.entries(EXACT_RULES).map(([k, v]) => {
    const sep = k.indexOf(" ");
    return [`${k.slice(0, sep).toUpperCase()} ${normalizePath(k.slice(sep + 1))}`, v];
  }),
);

/** Resolve the rate-limit rule for a request, or null when unthrottled. */
export function resolveRateLimitRule(method: string, path: string): RateLimitRule | null {
  const m = method.toUpperCase();
  const p = normalizePath(path);

  const exact = NORMALIZED_EXACT_RULES.get(`${m} ${p}`);
  if (exact) return exact;

  for (const rule of PATTERN_RULES) {
    if (rule.method === m && rule.pattern.test(p)) {
      return { scope: rule.scope, limit: rule.limit, windowMs: rule.windowMs };
    }
  }

  if ((m === "GET" || m === "HEAD") && PUBLIC_GET_PREFIXES.some((prefix) => p.startsWith(prefix))) {
    return PUBLIC_GET_FALLBACK;
  }

  return null;
}
