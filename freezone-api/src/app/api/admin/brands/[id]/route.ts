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

  const body = (await req.json().catch(() => null)) as {
    nameEn?: string;
    nameAr?: string;
    logoUrl?: string | null;
    sortOrder?: number;
    active?: boolean;
  } | null;
  if (!body) return Response.json({ error: "body" }, { status: 400 });

  try {
    await prisma.brand.update({
      where: { id },
      data: {
        ...(body.nameEn !== undefined ? { nameEn: body.nameEn } : {}),
        ...(body.nameAr !== undefined ? { nameAr: body.nameAr } : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
        ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });
    revalidateStorefrontData();
    await logAdminAction("brand.update", "Brand", { entityId: id, ...audit });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
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
    await prisma.product.updateMany({
      where: { brandId: id },
      data: { brandId: null },
    });
    await prisma.brand.delete({ where: { id } });
    revalidateStorefrontData();
    await logAdminAction("brand.delete", "Brand", { entityId: id, ...audit });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
