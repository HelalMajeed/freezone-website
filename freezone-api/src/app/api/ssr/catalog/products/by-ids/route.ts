import { getProductsByIds } from "@/lib/catalog";

/**
 * Batch product lookup by id — for wishlist, compare, and PC-builder part links.
 *   GET /api/ssr/catalog/products/by-ids?ids=1,2,3&locale=ar
 * Returns { products: Product[] } (published, non-deleted), capped at 100 and
 * re-ordered to match the requested id order. Never returns the full catalog.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
  const products = await getProductsByIds(ids, locale);
  return Response.json({ products });
}
