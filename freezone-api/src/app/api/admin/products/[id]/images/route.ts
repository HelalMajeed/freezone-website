import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

/** Append images after existing ones (preserves current rows and their ids). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const productId = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(productId)) return Response.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { urls?: unknown } | null;
  const urls = Array.isArray(body?.urls) ? body.urls.filter((u): u is string => typeof u === "string" && u.length > 0) : null;
  if (!urls?.length) return Response.json({ error: "urls non-empty array required" }, { status: 400 });

  try {
    const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!exists) return Response.json({ error: "not found" }, { status: 404 });

    const agg = await prisma.productImage.aggregate({
      where: { productId },
      _max: { sortOrder: true },
    });
    let start = (agg._max.sortOrder ?? -1) + 1;
    await prisma.productImage.createMany({
      data: urls.map((url) => ({ productId, url, sortOrder: start++ })),
    });
    revalidateStorefrontData();
    await logAdminAction("productImages.append", "Product", { entityId: productId, payload: { added: urls.length } });
    return Response.json({ ok: true, added: urls.length });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

/** Replace all gallery images in order (URLs must already exist, e.g. after upload). */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const productId = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(productId)) return Response.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { urls?: unknown } | null;
  const urls = Array.isArray(body?.urls) ? body.urls.filter((u): u is string => typeof u === "string" && u.length > 0) : null;
  if (!urls) return Response.json({ error: "urls array required" }, { status: 400 });

  try {
    const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!exists) return Response.json({ error: "not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId } }),
      prisma.productImage.createMany({
        data: urls.map((url, sortOrder) => ({ productId, url, sortOrder })),
      }),
    ]);

    revalidateStorefrontData();
    await logAdminAction("productImages.replace", "Product", { entityId: productId, payload: { count: urls.length } });
    return Response.json({ ok: true, count: urls.length });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

/** Reorder existing images by id list (must all belong to this product). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const productId = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(productId)) return Response.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { orderedIds?: unknown } | null;
  const orderedIds = Array.isArray(body?.orderedIds)
    ? body.orderedIds.map((x) => (typeof x === "number" ? x : parseInt(String(x), 10))).filter((n) => Number.isFinite(n))
    : null;
  if (!orderedIds?.length) return Response.json({ error: "orderedIds required" }, { status: 400 });

  try {
    const rows = await prisma.productImage.findMany({
      where: { productId },
      select: { id: true },
    });
    const set = new Set(rows.map((r) => r.id));
    if (orderedIds.length !== set.size || !orderedIds.every((i) => set.has(i))) {
      return Response.json({ error: "orderedIds must list each image id exactly once" }, { status: 400 });
    }

    await prisma.$transaction(
      orderedIds.map((id, sortOrder) => prisma.productImage.update({ where: { id }, data: { sortOrder } })),
    );
    revalidateStorefrontData();
    await logAdminAction("productImages.reorder", "Product", { entityId: productId });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
