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
    const rows = await prisma.showroomMedia.findMany({ orderBy: { sortOrder: "asc" } });
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
    kind?: string;
    url?: string;
    titleEn?: string | null;
    titleAr?: string | null;
    sortOrder?: number;
  } | null;

  const url = body?.url?.trim();
  if (!url) {
    return Response.json({ error: "url required" }, { status: 400 });
  }
  const kind = body?.kind === "video" ? "video" : "image";

  try {
    const row = await prisma.showroomMedia.create({
      data: {
        kind,
        url,
        titleEn: body?.titleEn?.trim() || null,
        titleAr: body?.titleAr?.trim() || null,
        sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
      },
    });
    revalidateStorefrontData();
    await logAdminAction("showroomMedia.create", "ShowroomMedia", { ...auditContext(auth.actor, req), entityId: row.id });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
