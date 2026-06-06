import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate, guardAdminRead } from "@/lib/admin-route-guard";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { jsonOk } from "@/lib/dashboard-guard";
import { parsePagination } from "@/lib/admin-orders-query";

/**
 * GET /api/admin/media — media library list.
 *
 * Additive pagination: when the `page` query param is present the response is
 * the standard paginated envelope `{ ok, data: { items, page, pageSize, total,
 * totalPages } }` (with optional `kind` filter). Without `page` the legacy bare
 * array (≤200 rows) is returned unchanged for old consumers.
 */
export async function GET(req: Request) {
  const read = await guardAdminRead(req);
  if (!read.ok) return read.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const kind = (searchParams.get("kind") ?? "").trim();
  const where = {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { url: { contains: q, mode: "insensitive" as const } },
            { altAr: { contains: q, mode: "insensitive" as const } },
            { altEn: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(kind === "image" || kind === "video" || kind === "model3d" ? { kind } : {}),
  };

  try {
    if (searchParams.has("page")) {
      const { page, pageSize } = parsePagination(searchParams, { defaultPageSize: 25, maxPageSize: 100 });
      const [items, total] = await Promise.all([
        prisma.mediaAsset.findMany({
          where,
          orderBy: { id: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.mediaAsset.count({ where }),
      ]);
      return jsonOk({
        items,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      });
    }

    const rows = await prisma.mediaAsset.findMany({
      where,
      orderBy: { id: "desc" },
      take: 200,
    });
    return Response.json(rows);
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function POST(req: Request) {
  const mutate = await guardAdminMutate(req);
  if (!mutate.ok) return mutate.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    url?: string;
    kind?: string;
    mimeType?: string;
    title?: string;
    altAr?: string;
    altEn?: string;
    fileSize?: number;
  } | null;

  if (!body?.url?.trim()) {
    return Response.json({ error: "url required" }, { status: 400 });
  }

  try {
    const row = await prisma.mediaAsset.create({
      data: {
        url: body.url.trim(),
        kind: body.kind === "video" || body.kind === "model3d" ? body.kind : "image",
        mimeType: body.mimeType ?? "",
        title: body.title?.trim() ?? "",
        altAr: body.altAr?.trim() ?? "",
        altEn: body.altEn?.trim() ?? "",
        fileSize: typeof body.fileSize === "number" ? body.fileSize : null,
      },
    });
    revalidateStorefrontData();
    await logAdminAction("media.create", "MediaAsset", {
      entityId: row.id,
      ...auditContext(mutate.actor, req),
    });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
