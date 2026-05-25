import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { getCurrentDashboardUser } from "@/lib/dashboard-auth";
import { ACTIVE_PRODUCT_WHERE } from "@/lib/admin-product-scope";

export type InboxItem = {
  id: string;
  type: "comment" | "review" | "changes" | "system";
  title: string;
  body: string;
  href: string;
  createdAt: string;
  unread: boolean;
};

export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  const user = await getCurrentDashboardUser(req);
  if (!user) {
    return Response.json({ ok: false, error: "يجب تسجيل الدخول من لوحة المشغّلين" }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: true, data: { items: [], unreadCount: 0 } });
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const isManager = user.role === "CATALOG_MANAGER" || user.role === "SUPER_ADMIN";
  const items: InboxItem[] = [];

  const myProductIds = (
    await prisma.product.findMany({
      where: { createdById: user.id, ...ACTIVE_PRODUCT_WHERE },
      select: { id: true },
    })
  ).map((p) => p.id);

  if (myProductIds.length) {
    const comments = await prisma.productComment.findMany({
      where: {
        productId: { in: myProductIds },
        createdAt: { gte: since },
        user: { role: { in: ["CATALOG_MANAGER", "SUPER_ADMIN"] } },
        NOT: { userId: user.id },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        product: { select: { id: true, nameAr: true, nameEn: true } },
        user: { select: { name: true } },
      },
    });
    for (const c of comments) {
      items.push({
        id: `comment-${c.id}`,
        type: "comment",
        title: `ملاحظة من ${c.user.name}`,
        body: c.text.slice(0, 200),
        href: `/admin/products/edit/${c.productId}`,
        createdAt: c.createdAt.toISOString(),
        unread: true,
      });
    }
  }

  const changesRequested = await prisma.product.findMany({
    where: { createdById: user.id, catalogStatus: "CHANGES_REQUESTED", ...ACTIVE_PRODUCT_WHERE },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, nameAr: true, nameEn: true, updatedAt: true, reviewNotes: true },
  });
  for (const p of changesRequested) {
    items.push({
      id: `changes-${p.id}`,
      type: "changes",
      title: "تعديلات مطلوبة",
      body: p.reviewNotes?.slice(0, 200) || p.nameAr || p.nameEn,
      href: `/admin/products/edit/${p.id}`,
      createdAt: p.updatedAt.toISOString(),
      unread: true,
    });
  }

  if (isManager) {
    const pending = await prisma.product.findMany({
      where: { catalogStatus: "PENDING_REVIEW", ...ACTIVE_PRODUCT_WHERE },
      orderBy: { submittedAt: "asc" },
      take: 15,
      select: { id: true, nameAr: true, nameEn: true, submittedAt: true, updatedAt: true },
    });
    for (const p of pending) {
      items.push({
        id: `review-${p.id}`,
        type: "review",
        title: "بانتظار مراجعتك",
        body: p.nameAr || p.nameEn,
        href: `/admin/products/edit/${p.id}?review=1`,
        createdAt: (p.submittedAt ?? p.updatedAt).toISOString(),
        unread: true,
      });
    }
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return Response.json({
    ok: true,
    data: { items: items.slice(0, 50), unreadCount: items.filter((i) => i.unread).length },
  });
}
