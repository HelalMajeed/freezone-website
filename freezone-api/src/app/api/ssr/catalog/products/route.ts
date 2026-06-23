import { parseCatalogFilterFromUrl, queryCatalogProducts } from "@/lib/catalog-filter";

/**
 * Storefront product listing — ALWAYS server-paginated.
 *
 * The storefront listing (ProductsCollectionClient) uses this endpoint for the
 * default browse path too (not only when a filter/category/search is active),
 * so the browser never receives the full catalog array from here — only the
 * requested page. queryCatalogProducts applies WHERE/ORDER BY/skip/take in SQL
 * and returns { products, total, page, pageSize, facets }; an empty filter set
 * yields page 1 of all published products.
 */
export async function GET(req: Request) {
  const input = parseCatalogFilterFromUrl(req.url);
  const result = await queryCatalogProducts(input);
  return Response.json(result);
}
