import { getPublicSite } from "@/lib/site-public";
import { getHomeCms } from "@/lib/layout-cms";
import {
  getCategoriesCatalog,
  getBrandsCatalog,
  getHomeCollections,
} from "@/lib/catalog";
import { queryBrandCounts } from "@/lib/catalog-filter";
import { getPublishedHomeSections } from "@/lib/cms-page-storefront";
import { getCachedSiteTheme } from "@/lib/site-theme";

/** Single response for the storefront shell — one HTTP round-trip.
 *  The full product catalog is intentionally NOT included: home rails read the
 *  small capped `collections`, the sidebar reads `brandCounts`, product browsing
 *  uses the paginated /api/ssr/catalog/products endpoint, and the PC builder
 *  lazy-loads its catalog from /api/ssr/pc-build-catalog. The customer browser
 *  must never receive the whole catalog via bootstrap. */
export async function GET(req: Request) {
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  const [site, home, categories, brands, homeSections, theme, collections, brandCounts] =
    await Promise.all([
      getPublicSite(locale),
      getHomeCms(locale),
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
    catalog: { categories, brands, collections, brandCounts },
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
