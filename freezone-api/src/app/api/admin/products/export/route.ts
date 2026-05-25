import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import {
  adminProductsOrderBy,
  adminProductsWhere,
  parseAdminProductsListQuery,
} from "@/lib/admin-products-list";

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "لا توجد قاعدة بيانات" }, { status: 503 });
  }

  const url = new URL(req.url);
  const q = parseAdminProductsListQuery(url);
  const maxExport = Math.min(2000, Math.max(1, parseInt(url.searchParams.get("limit") ?? "500", 10) || 500));

  try {
    const rows = await prisma.product.findMany({
      where: adminProductsWhere(q),
      orderBy: adminProductsOrderBy(q.sort),
      take: maxExport,
      select: {
        id: true,
        sku: true,
        nameAr: true,
        nameEn: true,
        price: true,
        quantity: true,
        inStock: true,
        published: true,
        catalogStatus: true,
        categoryId: true,
        brand: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { nameEn: true, slug: true } },
        brandRef: { select: { nameEn: true } },
      },
    });

    const header = [
      "id",
      "sku",
      "nameAr",
      "nameEn",
      "price",
      "quantity",
      "inStock",
      "published",
      "catalogStatus",
      "categoryId",
      "category",
      "brand",
      "updatedAt",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.sku,
          r.nameAr,
          r.nameEn,
          r.price,
          r.quantity,
          r.inStock,
          r.published,
          r.catalogStatus,
          r.categoryId,
          r.category.nameEn,
          r.brandRef?.nameEn || r.brand,
          r.updatedAt.toISOString(),
        ]
          .map((v) => csvEscape(typeof v === "boolean" ? (v ? "true" : "false") : v))
          .join(","),
      );
    }

    const csv = "\uFEFF" + lines.join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products-export-${Date.now()}.csv"`,
      },
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
