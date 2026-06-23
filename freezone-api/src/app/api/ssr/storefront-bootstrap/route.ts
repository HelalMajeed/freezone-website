import { getPublicSite } from "@/lib/site-public";
import { getHomeCms } from "@/lib/layout-cms";
import {
  getProductsCatalog,
  getCategoriesCatalog,
  getBrandsCatalog,
  getHomeCollections,
} from "@/lib/catalog";
import { queryBrandCounts } from "@/lib/catalog-filter";
import { getPublishedHomeSections } from "@/lib/cms-page-storefront";
import { getCachedSiteTheme } from "@/lib/site-theme";

/** Single response for the storefront shell — one HTTP round-trip.
 *  `catalog.products` is being retired: home rails read the small capped
 *  `collections`, the sidebar reads `brandCounts`, and product browsing uses
 *  the paginated /api/ssr/catalog/products endpoint. `products` is still sent
 *  during the migration and will be dropped once every consumer is off it. */
export async function GET(req: Request) {
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  const [site, home, products, categories, brands, homeSections, theme, collections, brandCounts] =
    await Promise.all([
      getPublicSite(locale),
      getHomeCms(locale),
      getProductsCatalog(locale),
      getCategoriesCatalog(locale),
      getBrandsCatalog(locale),
      getPublishedHomeSections(),
      getCachedSiteTheme(),
      getHomeCollections(locale),
      queryBrandCounts({}),
    ]);
  const body = {
    site,
    home,
    catalog: { products, categories, brands, collections, brandCounts },
    homeSections,
    theme,
  };
  /** Prevent any intermediary (browser tab restore, corporate proxy, CDN) from treating homepage payload as long-lived cache. */
  return Response.json(body, {
    headers: {
      "Cache-Control": "no-store, private, max-age=0, must-revalidate",
      Pragma: "no-cache",
      "CDN-Cache-Control": "no-store",
    },
  });
}
