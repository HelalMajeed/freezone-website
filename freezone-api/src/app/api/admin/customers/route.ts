import { z } from "zod";
import type { Customer, Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { jsonError } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";

/**
 * Customers admin list (API_CONTRACT §5).
 *
 * GET /api/admin/customers?search=&blocked=&page=&pageSize=
 *   → { ok, customers: [{ id, name, phone, email, isBlocked, createdAt,
 *        lastLoginAt, orderCount, totalSpent }], total }
 *
 * `orderCount` counts every order attributable to the account (by customerId
 * OR by exact phone match — claims past guest orders); `totalSpent` sums their
 * totals excluding cancelled orders (mirrors the orders-list revenue rule).
 */

const querySchema = z.object({
  search: z.string().trim().max(200).optional(),
  blocked: z.enum(["true", "false"]).optional(),
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
  const { search, blocked, page, pageSize } = parsed.data;

  const where: Prisma.CustomerWhereInput = {};
  if (blocked) where.isBlocked = blocked === "true";
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    const stats = await orderStatsFor(customers);

    return Response.json({
      ok: true,
      customers: customers.map((c) => {
        const s = stats.get(c.id) ?? { orderCount: 0, totalSpent: 0 };
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          isBlocked: c.isBlocked,
          createdAt: c.createdAt.toISOString(),
          lastLoginAt: c.lastLoginAt ? c.lastLoginAt.toISOString() : null,
          orderCount: s.orderCount,
          totalSpent: s.totalSpent,
        };
      }),
      total,
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

/** Per-customer order count + spend for one page of customers (one query). */
async function orderStatsFor(
  customers: Customer[],
): Promise<Map<number, { orderCount: number; totalSpent: number }>> {
  const stats = new Map<number, { orderCount: number; totalSpent: number }>();
  if (customers.length === 0) return stats;

  const ids = customers.map((c) => c.id);
  const phones = customers.map((c) => c.phone);
  const orders = await prisma.order.findMany({
    where: {
      OR: [{ customerId: { in: ids } }, { customerPhone: { in: phones } }],
    },
    select: { customerId: true, customerPhone: true, total: true, status: true },
  });

  const pageIds = new Set(ids);
  const byPhone = new Map(customers.map((c) => [c.phone, c.id]));
  for (const o of orders) {
    // Attribute by explicit link first, then by guest-order phone match.
    let customerId = o.customerId ?? byPhone.get(o.customerPhone);
    if (customerId !== undefined && !pageIds.has(customerId)) {
      // Linked to an off-page account — fall back to the phone match (if any).
      customerId = byPhone.get(o.customerPhone);
    }
    if (customerId === undefined) continue;
    let s = stats.get(customerId);
    if (!s) {
      s = { orderCount: 0, totalSpent: 0 };
      stats.set(customerId, s);
    }
    s.orderCount += 1;
    if (o.status !== "cancelled") s.totalSpent += o.total;
  }
  return stats;
}
