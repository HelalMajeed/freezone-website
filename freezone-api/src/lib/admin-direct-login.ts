/** Passwordless admin access (temporary / internal only). */
export function isAdminDirectLoginEnabled(): boolean {
  return (
    process.env.ADMIN_SKIP_AUTH === "true" || process.env.ADMIN_DIRECT_LOGIN === "true"
  );
}
