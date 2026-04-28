import type { PublicSite } from "./site-public";
import type { HomeCmsPayload } from "./layout-cms";
import type { Product, Category, Brand } from "./data";
import type { ThemeTokens } from "./theme-tokens";
import type { StorefrontCmsSection } from "./cms-page-storefront";
import { getApiInternalBase, getInternalApiFetchSignal } from "./api-internal";
import { PRODUCTS, CATEGORIES, BRANDS } from "./data";
import { isDatabaseConfigured } from "./prisma";
import { mergeThemeTokens, DEFAULT_THEME } from "./theme-tokens";
import { staticPublicSite } from "./site-public";
import { staticHomeCms } from "./layout-cms";

export type StorefrontBootstrapPayload = {
  site: PublicSite;
  home: HomeCmsPayload;
  catalog: { products: Product[]; categories: Category[]; brands: Brand[] };
  homeSections: StorefrontCmsSection[] | null;
  theme: ThemeTokens;
};

async function loadFallback(locale: "en" | "ar"): Promise<StorefrontBootstrapPayload> {
  return {
    site: staticPublicSite(locale),
    home: staticHomeCms(locale === "ar" ? "ar" : "en"),
    catalog: { products: PRODUCTS, categories: CATEGORIES, brands: BRANDS },
    homeSections: null,
    theme: DEFAULT_THEME,
  };
}

/** Client-safe fetch — no Next.js cache. */
export async function fetchStorefrontBootstrap(locale: "en" | "ar"): Promise<StorefrontBootstrapPayload> {
  if (!isDatabaseConfigured()) {
    return loadFallback(locale);
  }
  const base = getApiInternalBase();
  try {
    const r = await fetch(`${base}/api/ssr/storefront-bootstrap?locale=${locale}`, {
      signal: getInternalApiFetchSignal(),
      credentials: "omit",
      cache: "no-store",
    });
    if (!r.ok) {
      console.error("[storefront-bootstrap]", r.status);
      const fb = await loadFallback(locale);
      return { ...fb, theme: mergeThemeTokens(fb.theme) };
    }
    const raw = (await r.json()) as StorefrontBootstrapPayload;
    return { ...raw, theme: mergeThemeTokens(raw.theme) };
  } catch (e) {
    console.error("[storefront-bootstrap]", e);
    const fb = await loadFallback(locale);
    return { ...fb, theme: mergeThemeTokens(fb.theme) };
  }
}
