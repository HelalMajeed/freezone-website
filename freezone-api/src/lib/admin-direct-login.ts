/**
 * Passwordless admin access (temporary / internal only).
 *
 * Disabled in production regardless of the env flags — mirrors the dev-login
 * NODE_ENV guard. This endpoint grants a passwordless SUPER_ADMIN session, so a
 * stray `ADMIN_SKIP_AUTH`/`ADMIN_DIRECT_LOGIN` flag on the Fly app (NODE_ENV is
 * baked to "production" there) must never be enough to hand out full admin.
 */
export function isAdminDirectLoginEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return (
    process.env.ADMIN_SKIP_AUTH === "true" || process.env.ADMIN_DIRECT_LOGIN === "true"
  );
}
