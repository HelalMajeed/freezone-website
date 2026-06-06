import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { jsonOk } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { PUBLISHED_LIVE_WHERE } from "@/lib/admin-product-scope";
import { absolutizeUploadUrl } from "@/lib/catalog";

/**
 * GET /api/public/search-suggestions?q=<term>&limit=<n> — contract (h).
 *
 * `q` min 2 chars after trim (else empty arrays); `limit` caps products
 * (default 8, max 10). Matches nameEn/nameAr/brand/model/sku contains-
 * insensitive on published, non-deleted products. Categories/brands capped
 * at 4 each; `queries` is best-effort and may be `[]`.
 */
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 10;
const TAXONOMY_CAP = 4;
const CACHE_HEADER = { "Cache-Control": "public, max-age=60" };

const EMPTY = { products: [], categories: [], brands: [], queries: [] };

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limitRaw = parseInt(searchParams.get("limit") ?? "", 10);
  const limit =
    Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.min(limitRaw, MAX_LIMIT) : DEFAULT_LIMIT;

  if (q.length < 2 || !isDatabaseConfigured()) {
    return jsonOk(EMPTY, { headers: CACHE_HEADER });
  }

  const contains = { contains: q, mode: "insensitive" as const };

  try {
    const [products, categories, brands] = await Promise.all([
      prisma.product.findMany({
        where: {
          ...PUBLISHED_LIVE_WHERE,
          OR: [
            { nameEn: contains },
            { nameAr: contains },
            { brand: contains },
            { model: contains },
            { sku: contains },
          ],
        } satisfies Prisma.ProductWhereInput,
        orderBy: [{ sales: "desc" }, { reviews: "desc" }],
        take: limit,
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,
          price: true,
          salePrice: true,
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" },
            select: { url: true, urlW200: true },
          },
        },
      }),
      prisma.category.findMany({
        where: { active: true, OR: [{ nameEn: contains }, { nameAr: contains }, { slug: contains }] },
        orderBy: { sortOrder: "asc" },
        take: TAXONOMY_CAP,
        select: { id: true, slug: true, nameEn: true, nameAr: true },
      }),
      prisma.brand.findMany({
        where: { active: true, OR: [{ nameEn: contains }, { nameAr: contains }, { slug: contains }] },
        orderBy: { sortOrder: "asc" },
        take: TAXONOMY_CAP,
        select: { id: true, slug: true, nameEn: true, nameAr: true },
      }),
    ]);

    return jsonOk(
      {
        products: products.map((p) => {
          const img = p.images[0];
          const image = img ? absolutizeUploadUrl(img.urlW200 ?? img.url) : null;
          return {
            id: p.id,
            slug: p.slug,
            nameEn: p.nameEn,
            nameAr: p.nameAr,
            price: p.price,
            salePrice: p.salePrice,
            image,
          };
        }),
        categories,
        brands,
        /** Popular-term echo — best-effort field, never an error. */
        queries: [],
      },
      { headers: CACHE_HEADER },
    );
  } catch (e) {
    return handleRouteDbError(e);
  }
}
