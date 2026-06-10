/**
 * Customer auth — same pattern as dashboard-auth.ts (scrypt password hashing +
 * DB-backed revocable sessions), applied to storefront customer accounts.
 *
 * Cookie `fz_customer_session` stores only an opaque random token; the server
 * keeps the SHA-256 hash in `CustomerSession` and looks it up per request.
 * Sessions live 30 days; blocked customers fail the lookup immediately.
 */
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { hashPasswordScrypt, verifyPassword } from "./password-hash";

export const CUSTOMER_COOKIE = "fz_customer_session";
const SESSION_TTL_DAYS = 30;

export async function hashCustomerPassword(password: string): Promise<string> {
  return hashPasswordScrypt(password);
}

export { verifyPassword };

// ─── Session tokens ──────────────────────────────────────────────────────────

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Create a fresh session: opaque random token in cookie, hash in DB. */
export async function createCustomerSession(opts: {
  customerId: number;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ token: string; expiresAt: Date; sessionId: string }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.customerSession.create({
    data: {
      customerId: opts.customerId,
      tokenHash,
      userAgent: opts.userAgent?.slice(0, 500) ?? null,
      ip: opts.ip?.slice(0, 64) ?? null,
      expiresAt,
    },
  });
  return { token, expiresAt, sessionId: session.id };
}

export type CurrentCustomer = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  sessionId: string;
};

/** Public projection sent to the storefront — never includes hash/lock state. */
export function publicCustomer(c: { id: number; name: string; phone: string; email: string | null }) {
  return { id: c.id, name: c.name, phone: c.phone, email: c.email };
}

/** Look up the current customer from a request cookie. Returns null if no/invalid session. */
export async function getCurrentCustomer(req: Request): Promise<CurrentCustomer | null> {
  const token = readCustomerCookieFromHeader(req.headers.get("cookie"));
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const session = await prisma.customerSession.findUnique({
    where: { tokenHash },
    include: { customer: true },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (session.customer.isBlocked) return null;
  // Lightweight last-seen update — skip if updated in last 60s to avoid write storms
  if (Date.now() - session.lastSeenAt.getTime() > 60_000) {
    prisma.customerSession
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => {});
  }
  return {
    id: session.customer.id,
    name: session.customer.name,
    phone: session.customer.phone,
    email: session.customer.email,
    sessionId: session.id,
  };
}

export async function revokeCustomerSession(sessionId: string): Promise<void> {
  await prisma.customerSession
    .update({ where: { id: sessionId }, data: { revokedAt: new Date() } })
    .catch(() => {});
}

export async function revokeAllCustomerSessions(customerId: number): Promise<void> {
  await prisma.customerSession.updateMany({
    where: { customerId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ─── Cookie helpers (pure — unit-tested in customer-auth.test.ts) ────────────

/** Parse the customer session token out of a raw `Cookie` header value. */
export function readCustomerCookieFromHeader(cookieHeader: string | null): string | null {
  const cookie = cookieHeader || "";
  const m = cookie.match(new RegExp(`${CUSTOMER_COOKIE}=([^;]+)`));
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].trim());
  } catch {
    return m[1].trim();
  }
}

/** HttpOnly + SameSite=Lax always; Secure added in production. */
export function buildCustomerCookieHeader(token: string, maxAgeSec: number): string {
  const parts = [
    `${CUSTOMER_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function clearCustomerCookieHeader(): string {
  const parts = [`${CUSTOMER_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function jsonWithCustomerCookie(body: unknown, token: string, status = 200): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", buildCustomerCookieHeader(token, SESSION_TTL_DAYS * 24 * 60 * 60));
  return new Response(JSON.stringify(body), { status, headers });
}

export function jsonClearCustomerCookie(body: unknown): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", clearCustomerCookieHeader());
  return new Response(JSON.stringify(body), { status: 200, headers });
}

// ─── Brute-force throttle (5 fails → 15 min lock, same as dashboard) ─────────

const MAX_FAILS_BEFORE_LOCK = 5;
const LOCK_MINUTES = 15;

export async function recordFailedCustomerLogin(customerId: number): Promise<void> {
  const c = await prisma.customer.update({
    where: { id: customerId },
    data: { failedLogins: { increment: 1 } },
    select: { failedLogins: true },
  });
  if (c.failedLogins >= MAX_FAILS_BEFORE_LOCK) {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000),
        failedLogins: 0,
      },
    });
  }
}

export async function clearFailedCustomerLogins(customerId: number): Promise<void> {
  await prisma.customer.update({
    where: { id: customerId },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}

export function isCustomerLocked(c: { lockedUntil: Date | null }): boolean {
  return !!c.lockedUntil && c.lockedUntil.getTime() > Date.now();
}
