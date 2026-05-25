/**
 * Fail loudly when production admin secrets are missing or weak.
 * Called once at API startup (see server.ts).
 */
export function assertAdminSecretsConfigured(): void {
  const isProd = process.env.NODE_ENV === "production";
  const skipAuth = process.env.ADMIN_SKIP_AUTH === "true";

  if (skipAuth && isProd) {
    throw new Error(
      "ADMIN_SKIP_AUTH must not be enabled in production. Remove the env var and restart.",
    );
  }

  const sessionSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const requirePassword = process.env.ADMIN_REQUIRE_PASSWORD === "true";

  if (isProd) {
    if (!sessionSecret || sessionSecret.length < 32) {
      throw new Error(
        "ADMIN_SESSION_SECRET must be set (≥32 chars) in production. See docs/runbooks/secrets.md",
      );
    }
    if (!requirePassword || !password || password.length < 12) {
      throw new Error(
        "ADMIN_REQUIRE_PASSWORD=true and a strong ADMIN_PASSWORD are required in production.",
      );
    }
    if (sessionSecret === password) {
      throw new Error("ADMIN_SESSION_SECRET must differ from ADMIN_PASSWORD.");
    }
  } else if (!sessionSecret) {
    console.warn(
      "[freezone-api] ADMIN_SESSION_SECRET is unset — using dev-only fallback. Do not deploy without a real secret.",
    );
  }
}
