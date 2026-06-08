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
    const rows = await prisma.tickerItem.findMany({ orderBy: { sortOrder: "asc" } });
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
    textEn?: string;
    textAr?: string;
    iconSuffix?: string | null;
    sortOrder?: number;
  } | null;

  const textEn = body?.textEn?.trim();
  const textAr = body?.textAr?.trim() || textEn;
  if (!textEn) {
    return Response.json({ error: "textEn required" }, { status: 400 });
  }

  try {
    const row = await prisma.tickerItem.create({
      data: {
        textEn,
        textAr: textAr || textEn,
        iconSuffix: body?.iconSuffix?.trim() || null,
        sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
      },
    });
    revalidateStorefrontData();
    await logAdminAction("ticker.create", "TickerItem", { ...auditContext(auth.actor, req), entityId: row.id });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
