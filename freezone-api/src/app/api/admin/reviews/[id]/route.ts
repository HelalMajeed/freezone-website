import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate } from "@/lib/admin-route-guard";
import { jsonError } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { recomputeProductReviewStats } from "@/lib/review-stats";
import { REVIEW_PRODUCT_SELECT, serializeReview } from "@/lib/admin-reviews";

/**
 * Customer-review moderation mutations (API_CONTRACT §4).
 *
 * PATCH  /api/admin/reviews/:id  { isApproved: boolean } → { ok, review }
 * DELETE /api/admin/reviews/:id  → { ok }
 *
 * Both recompute Product.rating / Product.reviews inside the SAME transaction
 * (see src/lib/review-stats.ts) and write an audit-log entry.
 */

const patchSchema = z.object({ isApproved: z.boolean() }).strict();

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdminMutate(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return jsonError(400, "VALIDATION");

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "VALIDATION");
  const { isApproved } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({ where: { id }, select: { id: true, productId: true } });
      if (!existing) return null;
      const review = await tx.review.update({
        where: { id },
        data: { isApproved },
        include: { product: REVIEW_PRODUCT_SELECT },
      });
      await recomputeProductReviewStats(tx, existing.productId);
      return review;
    });

    if (!updated) return jsonError(404, "NOT_FOUND");

    await logAdminAction(isApproved ? "review.approve" : "review.unapprove", "Review", {
      entityId: id,
      payload: { productId: updated.productId, isApproved },
      ...auditContext(g.actor, req),
    });

    return Response.json({ ok: true, review: serializeReview(updated) });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdminMutate(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return jsonError(400, "VALIDATION");

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { id },
        select: { id: true, productId: true, customerName: true, rating: true, isApproved: true },
      });
      if (!existing) return null;
      await tx.review.delete({ where: { id } });
      await recomputeProductReviewStats(tx, existing.productId);
      return existing;
    });

    if (!deleted) return jsonError(404, "NOT_FOUND");

    await logAdminAction("review.delete", "Review", {
      entityId: id,
      payload: {
        productId: deleted.productId,
        customerName: deleted.customerName,
        rating: deleted.rating,
        wasApproved: deleted.isApproved,
      },
      ...auditContext(g.actor, req),
    });

    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
