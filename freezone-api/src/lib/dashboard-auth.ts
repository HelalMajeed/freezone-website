/**
 * Dashboard auth — scrypt password hashing + DB-backed sessions.
 *
 * Why scrypt: Node built-in (no extra deps), memory-hard, OWASP-recommended.
 * Why DB sessions (not stateless JWT): revocable on the spot (logout, role
 * change, account disable). Cookie stores only an opaque random token; the
 * server keeps the SHA-256 hash and looks it up.
 */
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "./prisma";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const DASHBOARD_COOKIE = "fz_dashboard_session";
const SESSION_TTL_DAYS = 7;
const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384; // CPU/memory cost — 2^14
const SCRYPT_R = 8;
const SCRYPT_P = 1;

/** Roles ordered by privilege (low → high). */
export const ROLES = ["viewer", "editor", "admin", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** True if `role` is at least as privileged as `minRole`. */
export function roleAtLeast(role: Role, minRole: Role): boolean {
  return ROLES.indexOf(role) >= ROLES.indexOf(minRole);
}

// ─── Password hashing ────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) throw new Error("PASSWORD_TOO_SHORT");
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize("NFKC"), salt, SCRYPT_KEYLEN);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    const candidate = await scrypt(password.normalize("NFKC"), salt, expected.length);
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// ─── Session tokens ──────────────────────────────────────────────────────────

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Create a fresh session: opaque random token in cookie, hash in DB. */
export async function createSession(opts: {
  userId: number;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.adminSession.create({
    data: {
      userId: opts.userId,
      tokenHash,
      userAgent: opts.userAgent?.slice(0, 500) ?? null,
      ip: opts.ip?.slice(0, 64) ?? null,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export type CurrentUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  sessionId: string;
};

/** Look up the current user from a request cookie. Returns null if no/invalid session. */
export async function getCurrentDashboardUser(req: Request): Promise<CurrentUser | null> {
  const token = readDashboardCookie(req);
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (!session.user.active) return null;
  if (!isRole(session.user.role)) return null;
  // Lightweight last-seen update — skip if updated in last 60s to avoid write storms
  if (Date.now() - session.lastSeenAt.getTime() > 60_000) {
    prisma.adminSession
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => {});
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    avatarUrl: session.user.avatarUrl,
    sessionId: session.id,
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.adminSession
    .update({ where: { id: sessionId }, data: { revokedAt: new Date() } })
    .catch(() => {});
}

export async function revokeAllUserSessions(userId: number): Promise<void> {
  await prisma.adminSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────

function readDashboardCookie(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${DASHBOARD_COOKIE}=([^;]+)`));
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].trim());
  } catch {
    return m[1].trim();
  }
}

function sameSite(): "Lax" | "Strict" | "None" {
  const raw = process.env.DASHBOARD_COOKIE_SAMESITE?.trim().toLowerCase();
  if (raw === "none") return "None";
  if (raw === "strict") return "Strict";
  return "Lax";
}

function buildCookieHeader(token: string, maxAgeSec: number): string {
  const ss = sameSite();
  const secure = process.env.NODE_ENV === "production" || ss === "None";
  const parts = [
    `${DASHBOARD_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${ss}`,
    `Max-Age=${maxAgeSec}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function clearCookieHeader(): string {
  const ss = sameSite();
  const secure = process.env.NODE_ENV === "production" || ss === "None";
  const parts = [`${DASHBOARD_COOKIE}=`, "Path=/", "HttpOnly", `SameSite=${ss}`, "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function jsonWithDashboardCookie(body: unknown, token: string): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", buildCookieHeader(token, SESSION_TTL_DAYS * 24 * 60 * 60));
  return new Response(JSON.stringify(body), { status: 200, headers });
}

export function jsonClearDashboardCookie(body: unknown): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", clearCookieHeader());
  return new Response(JSON.stringify(body), { status: 200, headers });
}

// ─── Brute-force throttle ────────────────────────────────────────────────────

const MAX_FAILS_BEFORE_LOCK = 5;
const LOCK_MINUTES = 15;

export async function recordFailedLogin(userId: number): Promise<void> {
  const u = await prisma.adminUser.update({
    where: { id: userId },
    data: { failedLogins: { increment: 1 } },
    select: { failedLogins: true },
  });
  if (u.failedLogins >= MAX_FAILS_BEFORE_LOCK) {
    await prisma.adminUser.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000),
        failedLogins: 0,
      },
    });
  }
}

export async function clearFailedLogins(userId: number): Promise<void> {
  await prisma.adminUser.update({
    where: { id: userId },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}

export function isUserLocked(u: { lockedUntil: Date | null }): boolean {
  return !!u.lockedUntil && u.lockedUntil.getTime() > Date.now();
}
