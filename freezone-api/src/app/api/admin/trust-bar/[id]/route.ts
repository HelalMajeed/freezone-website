import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminMutate, auditContext } from "@/lib/admin-route-guard";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await guardAdminMutate(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as {
    textEn?: string;
    textAr?: string;
    iconKey?: string;
    sortOrder?: number;
  } | null;
  if (!body) return Response.json({ error: "body" }, { status: 400 });

  try {
    await prisma.trustBarItem.update({
      where: { id },
      data: {
        ...(body.textEn !== undefined ? { textEn: body.textEn } : {}),
        ...(body.textAr !== undefined ? { textAr: body.textAr } : {}),
        ...(body.iconKey !== undefined ? { iconKey: body.iconKey } : {}),
        ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
      },
    });
    revalidateStorefrontData();
    await logAdminAction("trustBar.update", "TrustBarItem", { ...auditContext(auth.actor, req), entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await guardAdminMutate(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });
  try {
    await prisma.trustBarItem.delete({ where: { id } });
    revalidateStorefrontData();
    await logAdminAction("trustBar.delete", "TrustBarItem", { ...auditContext(auth.actor, req), entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
