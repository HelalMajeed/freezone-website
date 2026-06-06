import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { ACTIVE_PRODUCT_WHERE } from "@/lib/admin-product-scope";

export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: true, data: {} });
  }
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [noImages, noDesc, zeroPrice, lowStock] = await Promise.all([
    prisma.product.count({
      where: {
        ...ACTIVE_PRODUCT_WHERE,
        OR: [{ images: { none: {} } }, { createdAt: { lte: oneDayAgo }, images: { none: {} } }],
      },
    }),
    prisma.product.count({
      where: {
        ...ACTIVE_PRODUCT_WHERE,
        OR: [{ descAr: "" }, { descEn: "" }],
      },
    }),
    prisma.product.count({ where: { ...ACTIVE_PRODUCT_WHERE, price: 0 } }),
    prisma.product.count({
      where: {
        ...ACTIVE_PRODUCT_WHERE,
        inStock: true,
        quantity: { gt: 0, lte: prisma.product.fields.lowStockThreshold },
      },
    }),
  ]);

  const readyForPublish = await prisma.product.count({
    where: {
      ...ACTIVE_PRODUCT_WHERE,
      catalogStatus: "DRAFT",
      price: { gt: 0 },
      images: { some: {} },
      NOT: [{ descAr: "" }, { nameAr: "" }],
    },
  });

  return Response.json({
    ok: true,
    data: {
      no_images: noImages,
      no_desc: noDesc,
      zero_price: zeroPrice,
      low_stock: lowStock,
      ready_publish: readyForPublish,
      missing_attrs: 0,
    },
  });
}
