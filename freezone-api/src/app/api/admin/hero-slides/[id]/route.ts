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
    badgeEn?: string;
    badgeAr?: string;
    titleLine1En?: string;
    titleLine1Ar?: string;
    titleLine2En?: string;
    titleLine2Ar?: string;
    descEn?: string;
    descAr?: string;
    imageUrl?: string;
    primaryLabelEn?: string;
    primaryLabelAr?: string;
    primaryHref?: string;
    secondaryLabelEn?: string;
    secondaryLabelAr?: string;
    secondaryHref?: string;
    active?: boolean;
    sortOrder?: number;
  } | null;
  if (!body) return Response.json({ error: "body" }, { status: 400 });

  const data: Record<string, unknown> = {};
  const stringFields = [
    "badgeEn",
    "badgeAr",
    "titleLine1En",
    "titleLine1Ar",
    "titleLine2En",
    "titleLine2Ar",
    "descEn",
    "descAr",
    "imageUrl",
    "primaryLabelEn",
    "primaryLabelAr",
    "primaryHref",
    "secondaryLabelEn",
    "secondaryLabelAr",
    "secondaryHref",
  ] as const;
  for (const k of stringFields) {
    const v = body[k];
    if (v !== undefined) data[k] = v;
  }
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (body.active !== undefined) data.active = body.active;

  try {
    await prisma.heroSlide.update({ where: { id }, data });
    revalidateStorefrontData();
    await logAdminAction("heroSlide.update", "HeroSlide", { ...auditContext(auth.actor, req), entityId: id });
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
    await prisma.heroSlide.delete({ where: { id } });
    revalidateStorefrontData();
    await logAdminAction("heroSlide.delete", "HeroSlide", { ...auditContext(auth.actor, req), entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
