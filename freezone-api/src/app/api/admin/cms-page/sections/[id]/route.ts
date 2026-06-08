import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminMutate, auditContext } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { validateSectionPayload } from "@/lib/cms-section-payloads";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await guardAdminMutate(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    draftPayload?: unknown;
    visible?: boolean;
    type?: string;
    sortOrder?: number;
  } | null;
  if (!body) return Response.json({ error: "body" }, { status: 400 });

  try {
    /** Frozen payload types (contract (j)) are validated/normalized on write. */
    let draftPayload = body.draftPayload;
    if (draftPayload !== undefined) {
      let effectiveType = body.type;
      if (!effectiveType) {
        const existing = await prisma.cmsPageSection.findUnique({
          where: { id },
          select: { type: true },
        });
        if (!existing) return Response.json({ error: "not found" }, { status: 404 });
        effectiveType = existing.type;
      }
      const validated = validateSectionPayload(effectiveType, draftPayload);
      if (!validated.ok) {
        return Response.json(
          { ok: false, error: "VALIDATION", details: validated.errors },
          { status: 400 },
        );
      }
      draftPayload = validated.payload;
    }

    await prisma.cmsPageSection.update({
      where: { id },
      data: {
        ...(draftPayload !== undefined
          ? { draftPayload: draftPayload as Prisma.InputJsonValue }
          : {}),
        ...(body.visible !== undefined ? { visible: body.visible } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
      },
    });
    await logAdminAction("cmsSection.update", "CmsPageSection", { ...auditContext(auth.actor, req), entityId: id });
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
    await prisma.cmsPageSection.delete({ where: { id } });
    await logAdminAction("cmsSection.delete", "CmsPageSection", { ...auditContext(auth.actor, req), entityId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
