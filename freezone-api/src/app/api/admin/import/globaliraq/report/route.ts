import { readFile } from "node:fs/promises";
import path from "node:path";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reportPath = path.join(process.cwd(), "logs", "globaliraq-import-report.json");
  try {
    const raw = await readFile(reportPath, "utf8");
    return Response.json(JSON.parse(raw));
  } catch {
    return Response.json({ error: "no report yet", path: reportPath }, { status: 404 });
  }
}
