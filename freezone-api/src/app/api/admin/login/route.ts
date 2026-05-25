import { isAdminDirectLoginEnabled } from "@/lib/admin-direct-login";
import { signAdminSession, adminPasswordMatches, jsonWithSessionCookie } from "@/lib/admin-session";

export async function GET(_req: Request) {
  const direct = isAdminDirectLoginEnabled();
  return Response.json({
    requirePassword: direct ? false : process.env.ADMIN_REQUIRE_PASSWORD === "true",
    authBypass: direct,
    directLogin: direct,
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const password = body.password ?? "";
  if (!adminPasswordMatches(password)) {
    return Response.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }
  const token = signAdminSession();
  return jsonWithSessionCookie({ ok: true }, token);
}
