import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate, guardAdminRead } from "@/lib/admin-route-guard";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function GET(req: Request) {
  const read = await guardAdminRead(req);
  if (!read.ok) return read.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { url: { contains: q, mode: "insensitive" as const } },
          { altAr: { contains: q, mode: "insensitive" as const } },
          { altEn: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  try {
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
