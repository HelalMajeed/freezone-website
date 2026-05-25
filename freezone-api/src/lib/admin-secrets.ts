import { isAdminDirectLoginEnabled } from "./admin-direct-login";

/**
 * Fail loudly when production admin secrets are missing or weak.
 * Called once at API startup (see server.ts).
 */
export function assertAdminSecretsConfigured(): void {
  const isProd = process.env.NODE_ENV === "production";
  const directLogin = isAdminDirectLoginEnabled();

  const sessionSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const requirePassword = process.env.ADMIN_REQUIRE_PASSWORD === "true";

  if (directLogin) {
    console.warn(
      "[freezone-api] Direct admin login enabled (ADMIN_SKIP_AUTH / ADMIN_DIRECT_LOGIN). Password not required.",
    );
    if (isProd && (!sessionSecret || sessionSecret.length < 32)) {
      throw new Error(
        "ADMIN_SESSION_SECRET must be set (≥32 chars) even with direct login. See docs/runbooks/secrets.md",
      );
    }
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
