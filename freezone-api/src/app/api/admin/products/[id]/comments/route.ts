import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead, guardAdminMutate, auditContext } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "لا توجد قاعدة بيانات" }, { status: 503 });
  }
  const productId = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(productId)) {
    return Response.json({ ok: false, error: "معرّف غير صالح" }, { status: 400 });
  }

  try {
    const comments = await prisma.productComment.findMany({
      where: { productId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    return Response.json({ ok: true, data: { comments } });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const mutate = await guardAdminMutate(req);
  if (!mutate.ok) return mutate.response;
  const audit = auditContext(mutate.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "لا توجد قاعدة بيانات" }, { status: 503 });
  }
  const productId = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(productId)) {
    return Response.json({ ok: false, error: "معرّف غير صالح" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) {
    return Response.json({ ok: false, error: "النص مطلوب", code: "MISSING_TEXT" }, { status: 400 });
  }
  if (mutate.actor.kind !== "dashboard") {
    return Response.json({ ok: false, error: "يجب تسجيل الدخول من لوحة المشغّلين", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const row = await prisma.productComment.create({
      data: { productId, userId: mutate.actor.user.id, text },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    await logAdminAction("productComment.create", "ProductComment", {
      entityId: row.id,
      payload: { productId, text: text.slice(0, 120) },
      ...audit,
    });
    return Response.json({ ok: true, data: { comment: row } }, { status: 201 });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
