import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";

export async function GET(req: Request): Promise<Response> {
  const readGuard = await guardAdminRead(req);
  if (!readGuard.ok) return readGuard.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "لا توجد قاعدة بيانات", code: "NO_DATABASE" }, { status: 503 });
  }

  const url = new URL(req.url);
  const field = url.searchParams.get("field");
  const value = (url.searchParams.get("value") ?? "").trim();
  const excludeIdRaw = url.searchParams.get("excludeId");
  const excludeId = excludeIdRaw ? Number.parseInt(excludeIdRaw, 10) : undefined;

  if (field !== "slug" && field !== "sku") {
    return Response.json(
      { ok: false, error: "الحقل غير مدعوم", code: "INVALID_FIELD" },
      { status: 400 },
    );
  }
  if (!value) {
    return Response.json({ ok: true, data: { unique: true, field, value } });
  }

  const where =
    field === "slug"
      ? {
          slug: value,
          ...(Number.isFinite(excludeId) ? { id: { not: excludeId } } : {}),
        }
      : {
          sku: value,
          deletedAt: null,
          ...(Number.isFinite(excludeId) ? { id: { not: excludeId } } : {}),
        };

  const existing = await prisma.product.findFirst({
    where,
    select: { id: true, nameEn: true },
  });

  return Response.json({
    ok: true,
    data: {
      unique: !existing,
      field,
      value,
      conflict: existing ? { id: existing.id, nameEn: existing.nameEn } : null,
    },
  });
}
