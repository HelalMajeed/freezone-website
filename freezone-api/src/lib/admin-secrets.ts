import { isAdminDirectLoginEnabled } from "./admin-direct-login";

/**
 * Fail loudly when production admin secrets are missing or weak.
 * Called once at API startup (see server.ts).
 */
export function assertAdminSecretsConfigured(): void {
  const isProd = process.env.NODE_ENV === "production";
  // Always false in production — direct login fails closed there (2026-06-10
  // reversal, see src/lib/admin-direct-login.ts). The old relaxation of the
  // ADMIN_PASSWORD requirement therefore can never apply to production.
  const directLogin = isAdminDirectLoginEnabled();

  const sessionSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const requirePassword = process.env.ADMIN_REQUIRE_PASSWORD === "true";

  if (
    isProd &&
    (process.env.ADMIN_DIRECT_LOGIN === "true" || process.env.ADMIN_SKIP_AUTH === "true")
  ) {
    console.warn(
      "[freezone-api] ADMIN_DIRECT_LOGIN / ADMIN_SKIP_AUTH have no effect in production — " +
        "direct login is disabled; admins sign in at /dashboard/login with email/phone + password.",
    );
  }

  if (directLogin) {
    // Non-production only: dev convenience, password not required.
    console.warn(
      "[freezone-api] Direct admin login enabled (ADMIN_SKIP_AUTH / ADMIN_DIRECT_LOGIN). Password not required.",
    );
    return;
  }

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
