/**
 * Origin allow-list + CSRF-origin decision, shared by the CORS middleware and the
 * admin/dashboard CSRF guard in `server.ts` (SEC-4, docs/ENTERPRISE_GAP_AUDIT.md).
 *
 * Pure + unit-tested. The CSRF guard rejects a state-changing admin/dashboard
 * request only when its `Origin` header is present AND not allow-listed — a
 * cross-site forgery from a victim admin's browser always carries the attacker's
 * Origin, so it is blocked, while legitimate admin calls and no-Origin
 * server-to-server calls (ops workflows, internal importer) pass. Because it
 * reuses the SAME allow-list as CORS, it can never reject a request that CORS
 * already permits — it only closes the non-preflighted "simple request" gap.
 */

/** Production defaults, mirrored from the historical inline CORS list. Used when
 *  `CORS_ORIGINS` is unset so a fresh deploy is never accidentally wide-open. */
const PROD_DEFAULT_ORIGINS = [
  "https://freezone-iq.com",
  "https://freezone-website.fly.dev",
  /^https:\/\/[a-z0-9-]+\.netlify\.app$/i.source,
  "http://127.0.0.1:3000",
  "http://localhost:3000",
];

/** Build a matcher from `CORS_ORIGINS` (comma-separated; entries starting with
 *  `^` or containing `\.` are treated as case-insensitive regex patterns) or the
 *  production defaults. */
export function buildAllowedOriginMatcher(
  rawEnv: string | undefined = process.env.CORS_ORIGINS,
): (origin: string) => boolean {
  const raw = rawEnv?.trim();
  const explicit = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : PROD_DEFAULT_ORIGINS;
  const exact = new Set<string>();
  const patterns: RegExp[] = [];
  for (const entry of explicit) {
    if (entry.startsWith("^") || entry.includes("\\.")) {
      try {
        patterns.push(new RegExp(entry, "i"));
        continue;
      } catch {
        /* not a valid regex → fall through and match it exactly */
      }
    }
    exact.add(entry);
  }
  return (origin: string) => exact.has(origin) || patterns.some((p) => p.test(origin));
}

const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Admin realms whose mutations require a trusted Origin. Read paths and the
 *  public/ssr storefront surface are intentionally out of scope. */
function isGuardedPath(path: string): boolean {
  return path.startsWith("/api/admin") || path.startsWith("/api/dashboard");
}

/**
 * True when a request should be rejected as a cross-origin forgery: a
 * state-changing (`POST/PUT/PATCH/DELETE`) admin/dashboard request whose `Origin`
 * header is present but not allow-listed. Absent Origin (server-to-server, curl,
 * internal importer) is allowed, matching the CORS middleware.
 */
export function shouldRejectMutationOrigin(
  method: string,
  path: string,
  origin: string | undefined | null,
  isAllowed: (origin: string) => boolean,
): boolean {
  if (!CSRF_METHODS.has(method.toUpperCase())) return false;
  if (!isGuardedPath(path)) return false;
  return Boolean(origin) && !isAllowed(origin as string);
}
