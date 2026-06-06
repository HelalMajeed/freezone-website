import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate } from "@/lib/admin-route-guard";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdminMutate(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "bad id" }, { status: 400 });
  }
  try {
    await prisma.mediaAsset.delete({ where: { id } });
    await logAdminAction("media.delete", "MediaAsset", { entityId: id, ...auditContext(g.actor, req) });
  } catch (e) {
    try {
      return handleRouteDbError(e);
    } catch {
      /* not found or other */
    }
  }
  revalidateStorefrontData();
  return Response.json({ ok: true });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdminMutate(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "bad id" }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    altAr?: string;
    altEn?: string;
    kind?: string;
  } | null;
  if (!body) return Response.json({ error: "body" }, { status: 400 });
  try {
    await prisma.mediaAsset.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.altAr !== undefined ? { altAr: body.altAr } : {}),
        ...(body.altEn !== undefined ? { altEn: body.altEn } : {}),
        ...(body.kind !== undefined ? { kind: body.kind } : {}),
      },
    });
    revalidateStorefrontData();
    await logAdminAction("media.update", "MediaAsset", { entityId: id, ...auditContext(g.actor, req) });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
