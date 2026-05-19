import { getProductById } from "@/lib/catalog";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { buildProductDetailPayload } from "@/lib/classification/product-detail-payload";
import { loadCategoryAttributeSchema } from "@/lib/classification/persist";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "bad id" }, { status: 400 });
  }
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  const product = await getProductById(id, locale);
  if (!product) return Response.json(null);

  if (!isDatabaseConfigured()) {
    return Response.json({ product, specs: product.specs ?? {} });
  }

  const row = await prisma.product.findFirst({
    where: { id, published: true },
    select: { categoryId: true, attributeValues: true },
  });
  if (!row) return Response.json({ product, specs: product.specs ?? {} });

  const schema = await loadCategoryAttributeSchema(
    (args) => prisma.categoryAttribute.findMany(args),
    row.categoryId,
  );
  const payload = buildProductDetailPayload(product, schema, row.attributeValues);
  return Response.json(payload);
}
