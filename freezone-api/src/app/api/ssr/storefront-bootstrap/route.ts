import { getPublicSite } from "@/lib/site-public";
import { getHomeCms } from "@/lib/layout-cms";
import { getProductsCatalog, getCategoriesCatalog, getBrandsCatalog } from "@/lib/catalog";
import { getPublishedHomeSections } from "@/lib/cms-page-storefront";
import { getCachedSiteTheme } from "@/lib/site-theme";

/** Single response for Next.js layout — one HTTP round-trip instead of six. */
export async function GET(req: Request) {
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  const [site, home, products, categories, brands, homeSections, theme] = await Promise.all([
    getPublicSite(locale),
    getHomeCms(locale),
    getProductsCatalog(locale),
    getCategoriesCatalog(locale),
    getBrandsCatalog(locale),
    getPublishedHomeSections(),
    getCachedSiteTheme(),
  ]);
  return Response.json({
    site,
    home,
    catalog: { products, categories, brands },
    homeSections,
    theme,
  });
}
