import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { ACTIVE_PRODUCT_WHERE } from "@/lib/admin-product-scope";
import { jsonOk } from "@/lib/dashboard-guard";
import { parsePagination } from "@/lib/admin-orders-query";
import { handleRouteDbError } from "@/lib/db-route-error";

/**
 * GET /api/admin/notifications — persistent notification inbox (contract (e)
 * in docs/API_CONTRACTS.md). Additive over the legacy counter endpoint: the
 * existing `pendingReview` / `newComments` / `categoriesNoAttrs` / `role`
 * fields are retained so the current dashboard badge keeps working.
 *
 * Query: `page`, `pageSize` (default 25, max 100), `unreadOnly` (`true|false`),
 * `type` (exact match). Visibility: broadcast rows (`recipientId: null`) plus
 * rows addressed to the current dashboard user.
 */
export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return jsonOk({
      items: [],
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 1,
      unreadCount: 0,
      pendingReview: 0,
      newComments: 0,
      categoriesNoAttrs: 0,
      role: "SUPER_ADMIN",
    });
  }

  const user = g.actor.kind === "dashboard" ? g.actor.user : null;
  const role = user?.role ?? "SUPER_ADMIN";
  const isManager = role === "CATALOG_MANAGER" || role === "SUPER_ADMIN";

  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams, { defaultPageSize: 25, maxPageSize: 100 });
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const type = searchParams.get("type")?.trim();

  /** Broadcast rows + rows addressed to me (legacy/system sessions see broadcast only). */
  const visibility: Prisma.NotificationWhereInput = user
    ? { OR: [{ recipientId: null }, { recipientId: user.id }] }
    : { recipientId: null };
  const where: Prisma.NotificationWhereInput = {
    AND: [
      visibility,
      ...(unreadOnly ? [{ readAt: null }] : []),
      ...(type ? [{ type }] : []),
    ],
  };

  try {
    const [rows, total, unreadCount, pendingReview, categoriesNoAttrs] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { AND: [visibility, { readAt: null }] } }),
      isManager
        ? prisma.product.count({
            where: { ...ACTIVE_PRODUCT_WHERE, catalogStatus: "PENDING_REVIEW" },
          })
        : Promise.resolve(0),
      isManager ? countCategoriesWithoutAttributes() : Promise.resolve(0),
    ]);

    let newComments = 0;
    if (user) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (isManager) {
        newComments = await prisma.productComment.count({
          where: {
            createdAt: { gte: since },
            user: { role: "CATALOG_EDITOR" },
            product: { catalogStatus: { in: ["CHANGES_REQUESTED", "PENDING_REVIEW", "DRAFT"] } },
          },
        });
      } else {
        const myProducts = await prisma.product.findMany({
          where: { createdById: user.id, ...ACTIVE_PRODUCT_WHERE },
          select: { id: true },
        });
        const ids = myProducts.map((p) => p.id);
        if (ids.length) {
          newComments = await prisma.productComment.count({
            where: {
              productId: { in: ids },
              createdAt: { gte: since },
              user: { role: { in: ["CATALOG_MANAGER", "SUPER_ADMIN"] } },
              NOT: { userId: user.id },
            },
          });
        }
      }
    }

    return jsonOk({
      items: rows.map((n) => ({
        id: n.id,
        type: n.type,
        titleEn: n.titleEn,
        titleAr: n.titleAr,
        bodyEn: n.bodyEn,
        bodyAr: n.bodyAr,
        href: n.href,
        entity: n.entity,
        entityId: n.entityId,
        payloadJson: n.payloadJson ?? null,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      unreadCount,
      pendingReview,
      newComments,
      categoriesNoAttrs,
      role,
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

async function countCategoriesWithoutAttributes(): Promise<number> {
  /** Single indexed aggregate — no need to load every category into memory. */
  return prisma.category.count({
    where: { active: true, categoryAttributes: { none: {} } },
  });
}
