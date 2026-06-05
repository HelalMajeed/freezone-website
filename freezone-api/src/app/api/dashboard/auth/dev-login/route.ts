/**
 * Dev-only frictionless login.
 *
 * **NEVER usable in production**: returns 404 unless BOTH conditions are met:
 *   1. `process.env.NODE_ENV !== "production"` (Node runtime check)
 *   2. `process.env.DASHBOARD_DEV_BYPASS === "true"` (explicit opt-in env var)
 *
 * When enabled, upserts a SUPER_ADMIN row at `dev@local` (password rotated to
 * a fresh random value on each call so it cannot be guessed later) and returns
 * a normal dashboard session cookie. Audit-logged.
 *
 * Intended for local development only — set `DASHBOARD_DEV_BYPASS=true` in
 * `freezone-api/.env` while you iterate, never on the Fly app.
 */
import { randomBytes } from "node:crypto";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  createSession,
  hashPassword,
  jsonWithDashboardCookie,
} from "@/lib/dashboard-auth";
import { logAdminAction } from "@/lib/admin-audit";

const DEV_USER_EMAIL = "dev@local";

function isDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DASHBOARD_DEV_BYPASS === "true"
  );
}

export async function POST(req: Request): Promise<Response> {
  // Surface as a 404 (not 401) when not enabled, so production deployments
  // give no signal that this endpoint exists at all.
  if (!isDevBypassEnabled()) {
    return new Response("Not found", { status: 404 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  try {
    // Use a fresh random password so the dev account can't be guessed via
    // /dashboard/auth/login later. The bypass route is the only entry point.
    const ephemeralPassword = randomBytes(24).toString("base64url");
    const passwordHash = await hashPassword(ephemeralPassword);

    const user = await prisma.adminUser.upsert({
      where: { email: DEV_USER_EMAIL },
      create: {
        email: DEV_USER_EMAIL,
        name: "Dev User (auto)",
        passwordHash,
        role: "SUPER_ADMIN",
        active: true,
      },
      update: {
        passwordHash,
        role: "SUPER_ADMIN",
        active: true,
        failedLogins: 0,
        lockedUntil: null,
      },
    });

    const ua = req.headers.get("user-agent");
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;

    const session = await createSession({ userId: user.id, userAgent: ua, ip });

    await logAdminAction("auth.dev-login", "AdminUser", {
      entityId: user.id,
      payload: { email: DEV_USER_EMAIL },
    });

    return jsonWithDashboardCookie(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      },
      session.token,
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "dev-login failed" },
      { status: 500 },
    );
  }
}
