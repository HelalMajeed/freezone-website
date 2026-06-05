import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as {
    labelEn?: string;
    labelAr?: string;
    href?: string;
    imageUrl?: string | null;
    iconKey?: string | null;
    sortOrder?: number;
    active?: boolean;
  } | null;
  if (!body) return Response.json({ error: "body" }, { status: 400 });

  try {
    await prisma.homeSpotlightItem.update({
      where: { id },
      data: {
        ...(body.labelEn !== undefined ? { labelEn: body.labelEn } : {}),
        ...(body.labelAr !== undefined ? { labelAr: body.labelAr } : {}),
        ...(body.href !== undefined ? { href: body.href } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl || null } : {}),
        ...(body.iconKey !== undefined ? { iconKey: body.iconKey || null } : {}),
        ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });
    revalidateStorefrontData();
    await logAdminAction("homeSpotlight.update", "HomeSpotlightItem", { entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });
  try {
    await prisma.homeSpotlightItem.delete({ where: { id } });
    revalidateStorefrontData();
    await logAdminAction("homeSpotlight.delete", "HomeSpotlightItem", { entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
