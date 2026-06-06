import { getProductById, mapDbToProduct, storefrontProductIncludeBase, type LocaleCode } from "@/lib/catalog";
import type { Product } from "@/lib/data";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { buildProductDetailPayload, type ProductVariantDto } from "@/lib/classification/product-detail-payload";
import { loadCategoryAttributeSchema } from "@/lib/classification/persist";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "bad id" }, { status: 400 });
  }
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  const product = await getProductById(id, locale);
  if (!product) return Response.json(null, { status: 404 });

  if (!isDatabaseConfigured()) {
    return Response.json({
      product,
      specs: product.specs ?? {},
      groupedSpecs: [],
      specRows: [],
      attributes: [],
      variants: [],
      related: [],
    });
  }

  const row = await prisma.product.findFirst({
    where: { id, published: true, deletedAt: null },
    select: {
      categoryId: true,
      specs: true,
      attributeValues: true,
      variants: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sku: true,
          labelEn: true,
          labelAr: true,
          priceOverride: true,
          quantity: true,
          active: true,
        },
      },
    },
  });
  if (!row) return Response.json(null, { status: 404 });

  const schema = await loadCategoryAttributeSchema(
    (args) => prisma.categoryAttribute.findMany(args),
    row.categoryId,
  );

  const variants: ProductVariantDto[] = (row.variants ?? []).map((v) => ({
    id: v.id,
    sku: v.sku?.trim() ?? "",
    label: locale === "ar" ? v.labelAr || v.labelEn : v.labelEn || v.labelAr,
    price: v.priceOverride,
    quantity: v.quantity,
    active: v.active,
  }));

  const payload = buildProductDetailPayload(
    product,
    schema,
    row.attributeValues,
    locale,
    variants,
    row.specs,
    product.cat,
  );
  const related = await loadRelatedProducts(id, row.categoryId, locale);
  return Response.json({ ...payload, related });
}

const RELATED_LIMIT = 8;

/**
 * Best-effort related products: published, non-deleted rows from the same
 * primary category (best sellers first), excluding the product itself. Same
 * storefront `Product` shape as the catalog endpoints so cards render as-is.
 */
async function loadRelatedProducts(
  productId: number,
  categoryId: number,
  locale: LocaleCode,
): Promise<Product[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { categoryId, published: true, deletedAt: null, id: { not: productId } },
      orderBy: [{ sales: "desc" }, { reviews: "desc" }],
      take: RELATED_LIMIT,
      include: { ...storefrontProductIncludeBase },
    });
    return rows.map((r) => mapDbToProduct(r, locale));
  } catch (e) {
    console.error("[ssr/product] related query failed:", e instanceof Error ? e.message : e);
    return [];
  }
}
