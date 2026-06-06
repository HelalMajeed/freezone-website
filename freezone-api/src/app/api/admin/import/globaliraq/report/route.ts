import { readFile } from "node:fs/promises";
import path from "node:path";
import { guardAdminRead } from "@/lib/admin-route-guard";

export async function GET(req: Request) {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  const reportPath = path.join(process.cwd(), "logs", "globaliraq-import-report.json");
  try {
    const raw = await readFile(reportPath, "utf8");
    return Response.json(JSON.parse(raw));
  } catch {
    return Response.json({ error: "no report yet", path: reportPath }, { status: 404 });
  }
}
