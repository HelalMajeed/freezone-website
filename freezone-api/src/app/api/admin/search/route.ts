import { guardAdminRead } from "@/lib/admin-route-guard";
import { isDatabaseConfigured } from "@/lib/prisma";
import { runAdminSearch } from "@/lib/admin-search";

export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: true, data: { products: [], categories: [], brands: [], users: [] } });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = parseInt(url.searchParams.get("limit") ?? "15", 10) || 15;
  const data = await runAdminSearch(q, limit);
  return Response.json({ ok: true, data });
}
