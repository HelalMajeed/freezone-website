import type { PublicSite } from "./site-public";
import type { HomeCmsPayload } from "./layout-cms";
import type { Product, Category, Brand } from "./data";
import type { ThemeTokens } from "./theme-tokens";
import type { StorefrontCmsSection } from "./cms-page-storefront";
import { freezoneApiUrl, getApiInternalBase, getInternalApiFetchSignal } from "./api-internal";
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

/** Announcement marquee strips are disabled on the public storefront. */
function withoutMarqueeStrips(payload: StorefrontBootstrapPayload): StorefrontBootstrapPayload {
  return {
    ...payload,
    site: { ...payload.site, marqueeStrips: [] },
    theme: mergeThemeTokens(payload.theme),
  };
}

async function loadFallback(locale: "en" | "ar"): Promise<StorefrontBootstrapPayload> {
  return withoutMarqueeStrips({
    site: staticPublicSite(locale),
    home: staticHomeCms(locale === "ar" ? "ar" : "en"),
    catalog: { products: PRODUCTS, categories: CATEGORIES, brands: BRANDS },
    homeSections: null,
    theme: DEFAULT_THEME,
  });
}

function bootstrapUrl(locale: "en" | "ar"): string {
  return freezoneApiUrl(`/api/ssr/storefront-bootstrap?locale=${locale}`);
}

/**
 * Client-safe fetch — no Next.js cache.
 * - **Development:** optional `VITE_STATIC_STOREFRONT_ONLY=true` uses bundled static catalog; API
 *   errors fall back to the same (products may be empty by design in `data.ts`).
 * - **Production:** always loads from the API (see `getApiInternalBase()` default origin). Never
 *   silently substitutes an empty static catalog on failure — throws so the UI can show an error.
 */
export async function fetchStorefrontBootstrap(locale: "en" | "ar"): Promise<StorefrontBootstrapPayload> {
  const prod = import.meta.env.PROD;

  if (!isDatabaseConfigured()) {
    console.warn(
      "[storefront-bootstrap] VITE_STATIC_STOREFRONT_ONLY=true — dev static mode; catalog products come from src/lib/data.ts.",
    );
    return loadFallback(locale);
  }

  const url = bootstrapUrl(locale);

  try {
    const r = await fetch(url, {
      signal: getInternalApiFetchSignal(),
      credentials: "omit",
      cache: "no-store",
    });
    if (!r.ok) {
      const detail = `[storefront-bootstrap] ${r.status} ${r.statusText} — ${url}`;
      console.error(detail);
      if (prod) {
        throw new Error(
          `${detail}. Set VITE_API_URL in Netlify to your Freezone API origin (no /api suffix), clear cache, and redeploy.`,
        );
      }
      return loadFallback(locale);
    }
    const raw = (await r.json()) as StorefrontBootstrapPayload;
    if (!raw?.catalog || !Array.isArray(raw.catalog.products)) {
      const msg = `[storefront-bootstrap] Invalid JSON from ${url}`;
      console.error(msg, raw);
      if (prod) throw new Error(`${msg}. Check API deployment.`);
      return loadFallback(locale);
    }
    return withoutMarqueeStrips(raw);
  } catch (e) {
    if (prod) {
      const base = getApiInternalBase();
      console.error("[storefront-bootstrap] production fetch failed", url, e);
      throw new Error(
        `Could not load storefront from API (${base}). Check CORS, Fly machine health, and VITE_API_URL. ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    console.error(
      "[storefront-bootstrap] fetch failed — dev fallback (empty products if data.ts PRODUCTS is []). Check API on port 4000 and Vite proxy.",
      e,
    );
    return loadFallback(locale);
  }
}
