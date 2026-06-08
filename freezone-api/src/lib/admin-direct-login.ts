/**
 * Secret-link admin access.
 *
 * The dashboard has NO username/password UI. The only way to obtain an admin
 * session is a private link that carries a secret token:
 *
 *     https://freezone-iq.com/dashboard/login?key=<ADMIN_DIRECT_LINK_TOKEN>
 *
 * The token is verified server-side (constant-time) before any session is
 * issued. Opening /dashboard or /dashboard/login WITHOUT the key never creates
 * a session. Rotate access by changing ADMIN_DIRECT_LINK_TOKEN.
 *
 * Env model
 * ---------
 *  - ADMIN_DIRECT_LOGIN=true                 feature switch (also ADMIN_SKIP_AUTH=true)
 *  - ADMIN_DIRECT_LINK_TOKEN=<secret>        the secret carried by the link
 *  - ADMIN_DIRECT_LINK_TOKEN_HASH=<sha256>   optional: store only the hash instead
 *  - ADMIN_DIRECT_LOGIN_PRODUCTION_ACK=true  required in production (explicit ack)
 *
 * Fail-closed: if the feature is enabled but no token is configured, or (in
 * production) the ack is missing, the endpoint returns 403 and issues nothing.
 *
 * NOTE: a secret in a URL is reasonable protection for a single owner but is
 * weaker than edge auth. Cloudflare Access or an IP allowlist in front of
 * /dashboard + /api/dashboard is the recommended future hardening.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export type DirectLoginGateReason =
  | "DIRECT_LOGIN_DISABLED"
  | "DIRECT_LOGIN_TOKEN_REQUIRED"
  | "DIRECT_LOGIN_PRODUCTION_NOT_ACKNOWLEDGED";

export type DirectLoginGate = { ok: true } | { ok: false; code: DirectLoginGateReason };

/** Feature switch only — does NOT mean a session may be issued (see the gate). */
export function isAdminDirectLoginEnabled(): boolean {
  return process.env.ADMIN_SKIP_AUTH === "true" || process.env.ADMIN_DIRECT_LOGIN === "true";
}

function configuredToken(): string | null {
  const t = process.env.ADMIN_DIRECT_LINK_TOKEN?.trim();
  return t ? t : null;
}

function configuredTokenHash(): string | null {
  const h = process.env.ADMIN_DIRECT_LINK_TOKEN_HASH?.trim();
  return h ? h.toLowerCase() : null;
}

/** Whether a secret token is configured (plain or hash). */
export function hasAdminDirectLinkToken(): boolean {
  return configuredToken() !== null || configuredTokenHash() !== null;
}

/**
 * Whether the secret-link mechanism is allowed to issue a session right now,
 * independent of the supplied key. Returns a specific reason code on failure so
 * the route can surface a stable error without leaking config details.
 */
export function adminDirectLoginGate(): DirectLoginGate {
  if (!isAdminDirectLoginEnabled()) return { ok: false, code: "DIRECT_LOGIN_DISABLED" };
  if (!hasAdminDirectLinkToken()) return { ok: false, code: "DIRECT_LOGIN_TOKEN_REQUIRED" };
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ADMIN_DIRECT_LOGIN_PRODUCTION_ACK !== "true"
  ) {
    return { ok: false, code: "DIRECT_LOGIN_PRODUCTION_NOT_ACKNOWLEDGED" };
  }
  return { ok: true };
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Constant-time check of a supplied key against the configured secret. Prefers
 * the hash form when present so the plaintext secret never has to live in the
 * environment. Returns false for any missing/empty/mismatched input.
 */
export function verifyAdminDirectLinkToken(provided: string | null | undefined): boolean {
  if (!provided) return false;
  const hash = configuredTokenHash();
  if (hash) {
    const providedHash = createHash("sha256").update(provided).digest("hex");
    return safeEqual(Buffer.from(providedHash, "utf8"), Buffer.from(hash, "utf8"));
  }
  const token = configuredToken();
  if (!token) return false;
  return safeEqual(Buffer.from(provided, "utf8"), Buffer.from(token, "utf8"));
}
