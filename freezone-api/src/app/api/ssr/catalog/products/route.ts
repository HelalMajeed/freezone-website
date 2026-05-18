import { getProductsCatalog } from "@/lib/catalog";
import { parseCatalogFilterFromUrl, queryCatalogProducts } from "@/lib/catalog-filter";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const hasFilters =
    url.searchParams.has("cat") ||
    url.searchParams.has("brand") ||
    url.searchParams.has("price") ||
    url.searchParams.has("q") ||
    url.searchParams.has("sort") ||
    url.searchParams.has("page") ||
    url.searchParams.has("inStock") ||
    url.searchParams.has("onSale") ||
    url.searchParams.has("isNew") ||
    url.searchParams.has("featured") ||
    url.searchParams.has("listingAge") ||
    [...url.searchParams.keys()].some((k) => !isReservedCatalogParam(k));

  if (!hasFilters) {
    const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";
    const products = await getProductsCatalog(locale);
    return Response.json(products);
  }

  const input = parseCatalogFilterFromUrl(req.url);
  const result = await queryCatalogProducts(input);
  return Response.json(result);
}

function isReservedCatalogParam(key: string): boolean {
  return [
    "locale",
    "cat",
    "brand",
    "price",
    "inStock",
    "onSale",
    "isNew",
    "featured",
    "listingAge",
    "q",
    "sort",
    "page",
    "pageSize",
  ].includes(key);
}
