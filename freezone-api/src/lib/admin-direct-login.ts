/**
 * Passwordless admin direct entry.
 *
 * When enabled, opening the dashboard creates a SUPER_ADMIN session with NO
 * password and NO secret key. This is an explicit, owner-requested convenience
 * and is OFF by default. It turns on ONLY when the operator sets
 * `ADMIN_DIRECT_LOGIN=true` (or `ADMIN_SKIP_AUTH=true`) as an env var / Fly
 * secret — including in production.
 *
 * SECURITY: with this on, anyone who reaches /dashboard gets full admin. To
 * revert to no direct entry, unset the flag
 * (`flyctl secrets unset ADMIN_DIRECT_LOGIN -a freezone-website`). For a
 * protected-but-frictionless setup, put Cloudflare Access / an IP allowlist in
 * front of /dashboard + /api/dashboard.
 */

export type DirectLoginGate = { ok: true } | { ok: false; code: "DIRECT_LOGIN_DISABLED" };

/** Whether passwordless direct entry is enabled. */
export function isAdminDirectLoginEnabled(): boolean {
  return process.env.ADMIN_SKIP_AUTH === "true" || process.env.ADMIN_DIRECT_LOGIN === "true";
}

/** Whether the direct-login endpoint may issue a session right now. */
export function adminDirectLoginGate(): DirectLoginGate {
  return isAdminDirectLoginEnabled() ? { ok: true } : { ok: false, code: "DIRECT_LOGIN_DISABLED" };
}
