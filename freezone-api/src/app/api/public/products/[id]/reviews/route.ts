import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { jsonError } from "@/lib/dashboard-guard";
import { stripHtml } from "@/lib/html-sanitize";
import { normalizeIraqiPhone, isValidIraqiPhone } from "@/lib/phone";

/**
 * Public customer reviews for a product (API_CONTRACT §3).
 *
 * GET  /api/public/products/:id/reviews?page=1&pageSize=10
 *   → { ok, reviews: [{ id, customerName, rating, comment, createdAt }],
 *       total, ratingAvg, ratingCount } — approved only, newest first.
 *   404 UNKNOWN_PRODUCT for a bad/unknown product id.
 *
 * POST /api/public/products/:id/reviews
 *   Body { customerName (2–60), phone (Iraqi 07XXXXXXXXX), rating (int 1–5),
 *          comment (10–2000) } → 201 { ok, pending: true }.
 *   Reviews are created `isApproved=false` and only appear after moderation
 *   (admin recompute of Product.rating happens on approval, not here).
 *   Duplicate guard: same phone + product within 24h → 409 ALREADY_REVIEWED.
 *   Rate limit (5/min/IP) is enforced centrally in server.ts.
 */

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

const reviewBodySchema = z
  .object({
    customerName: z.string().min(2).max(60),
    phone: z.string().min(7).max(30),
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(10).max(2000),
  })
  .strict();

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function findPublishedProductId(rawId: string): Promise<number | null> {
  const id = parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await prisma.product.findFirst({
    where: { id, published: true, deletedAt: null },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const productId = await findPublishedProductId((await ctx.params).id);
  if (productId == null) return jsonError(404, "UNKNOWN_PRODUCT");

  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(sp.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );

  const approvedWhere = { productId, isApproved: true } as const;
  const [total, rows, agg] = await Promise.all([
    prisma.review.count({ where: approvedWhere }),
    prisma.review.findMany({
      where: approvedWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, customerName: true, rating: true, comment: true, createdAt: true },
    }),
    prisma.review.aggregate({ where: approvedWhere, _avg: { rating: true } }),
  ]);

  const ratingAvg = total > 0 && agg._avg.rating != null ? Math.round(agg._avg.rating * 10) / 10 : 0;
  return json(200, {
    ok: true,
    reviews: rows.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    ratingAvg,
    ratingCount: total,
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const productId = await findPublishedProductId((await ctx.params).id);
  if (productId == null) return jsonError(404, "UNKNOWN_PRODUCT");

  const raw = await req.json().catch(() => null);
  const parsed = reviewBodySchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "body")))];
    return jsonError(400, "VALIDATION", { fields });
  }

  const customerName = stripHtml(parsed.data.customerName).slice(0, 60);
  const comment = stripHtml(parsed.data.comment).slice(0, 2000);
  if (customerName.length < 2) return jsonError(400, "VALIDATION", { fields: ["customerName"] });
  if (comment.length < 10) return jsonError(400, "VALIDATION", { fields: ["comment"] });
  if (!isValidIraqiPhone(parsed.data.phone)) return jsonError(400, "INVALID_PHONE");
  const phone = normalizeIraqiPhone(parsed.data.phone);

  const duplicate = await prisma.review.findFirst({
    where: {
      productId,
      phone,
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (duplicate) return jsonError(409, "ALREADY_REVIEWED");

  const customer = await currentCustomerFromCookie(req);
  await prisma.review.create({
    data: {
      productId,
      customerId: customer?.id ?? null,
      customerName: customer?.name?.trim() || customerName,
      phone,
      rating: parsed.data.rating,
      comment,
      isApproved: false,
    },
  });

  return json(201, { ok: true, pending: true });
}

// ─── Optional customer session (guest submissions remain fully supported) ────

const CUSTOMER_COOKIE = "fz_customer_session";

/**
 * Best-effort resolution of the signed-in customer from the `fz_customer_session`
 * cookie — same opaque-token/SHA-256 pattern as the dashboard sessions. Any
 * failure (no cookie, expired, revoked, blocked, missing tables) degrades to a
 * guest submission rather than an error.
 */
async function currentCustomerFromCookie(req: Request): Promise<{ id: number; name: string } | null> {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${CUSTOMER_COOKIE}=([^;]+)`));
  if (!m) return null;
  try {
    const tokenHash = createHash("sha256").update(decodeURIComponent(m[1])).digest("hex");
    const session = await prisma.customerSession.findUnique({
      where: { tokenHash },
      select: {
        revokedAt: true,
        expiresAt: true,
        customer: { select: { id: true, name: true, isBlocked: true } },
      },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
    if (session.customer.isBlocked) return null;
    return { id: session.customer.id, name: session.customer.name };
  } catch {
    return null;
  }
}
