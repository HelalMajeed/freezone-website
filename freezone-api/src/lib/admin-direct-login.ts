/**
 * Passwordless admin direct entry — NON-PRODUCTION ONLY.
 *
 * When enabled, opening the dashboard creates a SUPER_ADMIN session with NO
 * password and NO secret key. It is OFF by default and turns on ONLY when the
 * operator sets `ADMIN_DIRECT_LOGIN=true` (or `ADMIN_SKIP_AUTH=true`) AND the
 * API is not running with `NODE_ENV=production`.
 *
 * History: commit 06f25c6 allowed direct entry in production by owner request.
 * The 2026-06-10 global-launch mission reversed that decision (see
 * ASSUMPTIONS.md A-1): production admins sign in with email/phone + password
 * via `POST /api/dashboard/auth/login`, and direct entry fails closed with
 * `403 DIRECT_LOGIN_DISABLED_IN_PRODUCTION` regardless of env flags. The
 * flags remain a local/staging development convenience only.
 */

export type DirectLoginGate =
  | { ok: true }
  | { ok: false; code: "DIRECT_LOGIN_DISABLED" | "DIRECT_LOGIN_DISABLED_IN_PRODUCTION" };

function directLoginFlagSet(): boolean {
  return process.env.ADMIN_SKIP_AUTH === "true" || process.env.ADMIN_DIRECT_LOGIN === "true";
}

/** Whether passwordless direct entry is enabled. Always false in production. */
export function isAdminDirectLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && directLoginFlagSet();
}

/** Whether the direct-login endpoint may issue a session right now. */
export function adminDirectLoginGate(): DirectLoginGate {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, code: "DIRECT_LOGIN_DISABLED_IN_PRODUCTION" };
  }
  return directLoginFlagSet() ? { ok: true } : { ok: false, code: "DIRECT_LOGIN_DISABLED" };
}
