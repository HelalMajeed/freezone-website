import { jsonClearSessionCookie } from "@/lib/admin-session";

export async function POST(_req: Request) {
  return jsonClearSessionCookie({ ok: true });
}
