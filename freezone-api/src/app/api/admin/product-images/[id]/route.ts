import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate } from "@/lib/admin-route-guard";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const mutateGuard = await guardAdminMutate(req);
  if (!mutateGuard.ok) return mutateGuard.response;
  const audit = auditContext(mutateGuard.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { url?: string } | null;
  const url = body?.url?.trim();
  if (!url) return Response.json({ error: "url required" }, { status: 400 });

  try {
    await prisma.productImage.update({ where: { id }, data: { url } });
    await logAdminAction("productImage.update", "ProductImage", { entityId: id, ...audit });
  } catch (e) {
    try {
      return handleRouteDbError(e);
    } catch {
      return Response.json({ error: "not found" }, { status: 404 });
    }
  }
  revalidateStorefrontData();
  return Response.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const mutateGuard = await guardAdminMutate(req);
  if (!mutateGuard.ok) return mutateGuard.response;
  const audit = auditContext(mutateGuard.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  try {
    await prisma.productImage.delete({ where: { id } });
    await logAdminAction("productImage.delete", "ProductImage", { entityId: id, ...audit });
  } catch (e) {
    try {
      return handleRouteDbError(e);
    } catch {
      return Response.json({ error: "not found" }, { status: 404 });
    }
  }
  revalidateStorefrontData();
  return Response.json({ ok: true });
}
