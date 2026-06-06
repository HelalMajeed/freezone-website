import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate } from "@/lib/admin-route-guard";
import { importExternalImage } from "@/lib/import-external-image";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { logAdminAction } from "@/lib/admin-audit";

const USER_ERRORS: Record<string, string> = {
  INVALID_URL: "رابط غير صالح.",
  INVALID_PROTOCOL: "يُسمح فقط بروابط http أو https.",
  BLOCKED_HOST: "الرابط غير مسموح.",
  BLOCKED_IP: "الرابط غير مسموح.",
  BLOCKED_DNS: "الرابط يشير إلى شبكة محلية غير مسموحة.",
  DNS_FAILED: "تعذّر التحقق من عنوان الرابط.",
  TOO_LARGE: "الصورة أكبر من الحد المسموح (15MB).",
  TOO_SMALL: "الملف صغير جداً أو تالف.",
  NOT_IMAGE: "الرابط لا يشير إلى صورة صالحة.",
  FETCH_FAILED: "تعذّر تنزيل الصورة. تأكد أن الرابط مباشر لصورة.",
};

export async function POST(req: Request) {
  const g = await guardAdminMutate(req);
  if (!g.ok) return g.response;

  const body = (await req.json().catch(() => null)) as {
    url?: string;
    productId?: number;
    alt?: string;
  } | null;

  const sourceUrl = typeof body?.url === "string" ? body.url.trim() : "";
  if (!sourceUrl) {
    return Response.json({ error: "url مطلوب" }, { status: 400 });
  }

  const productId =
    body?.productId != null && Number.isFinite(Number(body.productId)) ? Number(body.productId) : undefined;

  try {
    const imported = await importExternalImage(sourceUrl, { productId });

    let productImageId: number | null = null;
    if (productId != null && isDatabaseConfigured()) {
      const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
      if (!exists) {
        return Response.json({ error: "المنتج غير موجود" }, { status: 404 });
      }
      const agg = await prisma.productImage.aggregate({
        where: { productId },
        _max: { sortOrder: true },
      });
      const row = await prisma.productImage.create({
        data: {
          productId,
          url: imported.url,
          sortOrder: (agg._max.sortOrder ?? -1) + 1,
          originalSourceUrl: imported.originalSourceUrl,
        },
      });
      productImageId = row.id;
      revalidateStorefrontData();
    }

    await logAdminAction("media.importImage", "Product", {
      entityId: productId,
      payload: { url: imported.url, source: imported.originalSourceUrl },
      ...auditContext(g.actor, req),
    });

    return Response.json({
      ok: true,
      image: {
        ...imported,
        productImageId,
        alt: body?.alt ?? "",
      },
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "FETCH_FAILED";
    const msg = USER_ERRORS[code] ?? USER_ERRORS.FETCH_FAILED;
    const status =
      code === "TOO_LARGE"
        ? 413
        : code.startsWith("BLOCKED") || code === "INVALID_PROTOCOL" || code === "INVALID_URL"
          ? 400
          : 422;
    return Response.json({ ok: false, error: msg, code }, { status });
  }
}
