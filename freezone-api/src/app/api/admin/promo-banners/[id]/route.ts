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
    titleEn?: string;
    titleAr?: string;
    subEn?: string;
    subAr?: string;
    imageUrl?: string;
    href?: string;
    catSlug?: string | null;
    sortOrder?: number;
    active?: boolean;
  } | null;
  if (!body) return Response.json({ error: "body" }, { status: 400 });

  try {
    await prisma.promoBanner.update({
      where: { id },
      data: {
        ...(body.titleEn !== undefined ? { titleEn: body.titleEn } : {}),
        ...(body.titleAr !== undefined ? { titleAr: body.titleAr } : {}),
        ...(body.subEn !== undefined ? { subEn: body.subEn } : {}),
        ...(body.subAr !== undefined ? { subAr: body.subAr } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.href !== undefined ? { href: body.href } : {}),
        ...(body.catSlug !== undefined ? { catSlug: body.catSlug || null } : {}),
        ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });
    revalidateStorefrontData();
    await logAdminAction("promoBanner.update", "PromoBanner", { ...auditContext(auth.actor, req), entityId: id });
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
    await prisma.promoBanner.delete({ where: { id } });
    revalidateStorefrontData();
    await logAdminAction("promoBanner.delete", "PromoBanner", { ...auditContext(auth.actor, req), entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
