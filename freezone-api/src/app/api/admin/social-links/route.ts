import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead, guardAdminMutate, auditContext } from "@/lib/admin-route-guard";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function GET(req: Request) {
  const auth = await guardAdminRead(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  try {
    const rows = await prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } });
    return Response.json(rows);
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function POST(req: Request) {
  const auth = await guardAdminMutate(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as {
    platform?: string;
    url?: string;
    sortOrder?: number;
    showInTopBar?: boolean;
  } | null;

  const platform = body?.platform?.trim().toLowerCase();
  const url = body?.url?.trim();
  if (!platform || !url) {
    return Response.json({ error: "platform and url required" }, { status: 400 });
  }

  try {
    const row = await prisma.socialLink.create({
      data: {
        platform,
        url,
        sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
        showInTopBar: body?.showInTopBar !== false,
      },
    });
    revalidateStorefrontData();
    await logAdminAction("socialLink.create", "SocialLink", { ...auditContext(auth.actor, req), entityId: row.id });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
