import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { jsonError } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { REVIEW_PRODUCT_SELECT, serializeReview } from "@/lib/admin-reviews";

/**
 * Customer-review moderation list (API_CONTRACT §4).
 *
 * GET /api/admin/reviews?status=pending|approved|all&search=&page=&pageSize=
 *   → { ok, reviews: [...incl. phone, product { id, nameEn, nameAr }], total, pendingCount }
 *
 * Distinct from /api/admin/review-queue (internal product-publishing workflow):
 * these are storefront customer reviews awaiting approval.
 */

const querySchema = z.object({
  status: z.enum(["pending", "approved", "all"]).default("pending"),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: Request) {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return jsonError(400, "VALIDATION");
  const { status, search, page, pageSize } = parsed.data;

  const where: Prisma.ReviewWhereInput = {};
  if (status === "pending") where.isApproved = false;
  if (status === "approved") where.isApproved = true;
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { comment: { contains: search, mode: "insensitive" } },
      { product: { nameEn: { contains: search, mode: "insensitive" } } },
      { product: { nameAr: { contains: search, mode: "insensitive" } } },
    ];
  }

  try {
    const [rows, total, pendingCount] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { product: REVIEW_PRODUCT_SELECT },
      }),
      prisma.review.count({ where }),
      prisma.review.count({ where: { isApproved: false } }),
    ]);

    return Response.json({
      ok: true,
      reviews: rows.map(serializeReview),
      total,
      pendingCount,
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
