import type { AdminRole } from "@prisma/client";
import type { Request } from "express";
import { requireAdminRole, requireAdminRead } from "@/lib/admin-auth";

/** Express helper — convert to Web Request and delegate. */
export async function expressRequireAdminRead(req: Request): Promise<Response | null> {
  const webReq = expressToWebRequest(req);
  const g = await requireAdminRead(webReq);
  if (!g.ok) return g.response;
  return null;
}

export async function expressRequireAdminRole(
  req: Request,
  roles: AdminRole[],
): Promise<Response | null> {
  const webReq = expressToWebRequest(req);
  const g = await requireAdminRole(webReq, roles);
  if (!g.ok) return g.response;
  return null;
}

function expressToWebRequest(req: Request): globalThis.Request {
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
  const url = `${proto}://${host}${req.originalUrl}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else headers.set(k, v);
  }
  return new Request(url, { method: req.method, headers });
}
