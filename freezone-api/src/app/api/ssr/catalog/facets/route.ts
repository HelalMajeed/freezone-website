import { parseCatalogFilterFromUrl } from "@/lib/catalog-filter";
import { queryCatalogFacets } from "@/lib/catalog-facets";

export async function GET(req: Request) {
  const input = parseCatalogFilterFromUrl(req.url);
  if (!input.cat) {
    return Response.json({ filters: [] });
  }
  const result = await queryCatalogFacets(input);
  return Response.json(result);
}
