import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const COOKIE_NAME = "fz_admin_session";

/**
 * Transition flag: the legacy HMAC `fz_admin_session` cookie is only accepted
 * by the admin route guards when LEGACY_ADMIN_COOKIE=true. Default OFF — the
 * dashboard session (`fz_dashboard_session`, DB-backed, revocable, with real
 * actor attribution) is the supported auth. See .env.example.
 */
export function isLegacyAdminCookieEnabled(): boolean {
  return process.env.LEGACY_ADMIN_COOKIE === "true";
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET is required in production");
  }
  const fallback = process.env.ADMIN_PASSWORD?.trim();
  if (fallback) return fallback;
  return "dev-only-insecure-admin-session-secret-min-32-chars!!";
}

export function signAdminSession(): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const nonce = randomBytes(8).toString("hex");
  const payload = Buffer.from(JSON.stringify({ exp, nonce }), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string): boolean {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;
    const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp: number };
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

/** قراءة جلسة الإدارة من ترويسة Cookie (خادم Express / Web Request). */
export function isAdminAuthenticatedFromRequest(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const raw = m ? m[1].trim() : "";
  if (!raw) return false;
  let token: string;
  try {
    token = decodeURIComponent(raw);
  } catch {
    token = raw;
  }
  return verifyAdminSessionToken(token);
}

function adminSessionSameSite(): "Lax" | "Strict" | "None" {
  const raw = process.env.ADMIN_SESSION_SAMESITE?.trim().toLowerCase();
  if (raw === "none") return "None";
  if (raw === "strict") return "Strict";
  return "Lax";
}

function sessionCookieHeader(token: string, maxAgeSec: number): string {
  const sameSite = adminSessionSameSite();
  const secure = process.env.NODE_ENV === "production" || sameSite === "None";
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Max-Age=${maxAgeSec}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function clearCookieHeader(): string {
  const sameSite = adminSessionSameSite();
  const secure = process.env.NODE_ENV === "production" || sameSite === "None";
  const parts = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", `SameSite=${sameSite}`, "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function jsonWithSessionCookie(body: unknown, token: string): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", sessionCookieHeader(token, 60 * 60 * 24 * 7));
  return new Response(JSON.stringify(body), { status: 200, headers });
}

export function jsonClearSessionCookie(body: unknown): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", clearCookieHeader());
  return new Response(JSON.stringify(body), { status: 200, headers });
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "changeme2024";
}

export function adminPasswordMatches(_input: string): boolean {
  if (process.env.ADMIN_REQUIRE_PASSWORD === "true") {
    const expected = getAdminPassword();
    try {
      const a = Buffer.from(_input.normalize("NFC").toLowerCase(), "utf8");
      const b = Buffer.from(expected.normalize("NFC").toLowerCase(), "utf8");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
  return true;
}
