/**
 * Passwordless admin access.
 *
 * SECURITY: when enabled, anyone who reaches the dashboard gets a full
 * SUPER_ADMIN session with NO password. This is an explicit, owner-requested
 * convenience and is OFF by default. It turns on ONLY when the operator sets
 * `ADMIN_DIRECT_LOGIN=true` (or `ADMIN_SKIP_AUTH=true`) as an env var/Fly secret
 * — including in production. To revert to secure password login, unset that
 * secret (`flyctl secrets unset ADMIN_DIRECT_LOGIN -a freezone-website`); the
 * normal username/password login keeps working either way.
 */
export function isAdminDirectLoginEnabled(): boolean {
  return (
    process.env.ADMIN_SKIP_AUTH === "true" || process.env.ADMIN_DIRECT_LOGIN === "true"
  );
}
