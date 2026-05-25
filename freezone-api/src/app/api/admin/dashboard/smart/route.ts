import { guardAdminRead } from "@/lib/admin-route-guard";
import { getCurrentDashboardUser } from "@/lib/dashboard-auth";
import { isDatabaseConfigured } from "@/lib/prisma";
import { buildSmartDashboard } from "@/lib/admin-smart-dashboard";
import type { AdminRole } from "@prisma/client";

export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "NO_DATABASE" }, { status: 503 });
  }
  const user = await getCurrentDashboardUser(req);
  const role: AdminRole = user?.role ?? "SUPER_ADMIN";
  const data = await buildSmartDashboard(user?.id ?? null, role);
  return Response.json({
    ok: true,
    data: {
      user: user
        ? { id: user.id, name: user.name, email: user.email, role: user.role }
        : { id: 0, name: "مسؤول", email: "", role },
      todayAr: new Date().toLocaleDateString("ar-IQ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      ...data,
    },
  });
}
