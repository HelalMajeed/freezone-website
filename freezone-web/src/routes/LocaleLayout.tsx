import { Suspense, lazy, useEffect, useLayoutEffect } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { NavBar } from "@/components/layout/NavBar";
import { SetDocumentLocale } from "@/components/providers/SetDocumentLocale";
import { PageTransition } from "@/components/motion/PageTransition";
import {
  fetchStorefrontBootstrapShared,
  readShellSnapshot,
  shellFromBundle,
  writeShellSnapshot,
} from "@/lib/storefront-bootstrap";
import { StorefrontProvider } from "@/components/providers/StorefrontProvider";
import { ThemeApplier } from "@/components/providers/ThemeApplier";
import { StoreJsonLd } from "@/components/seo/StoreJsonLd";
import { StorefrontPrefetch } from "@/components/storefront/StorefrontPrefetch";
import { setLocale } from "@/i18n/i18n";
import { trackPageView } from "@/lib/analytics";
import { LocaleRouteFallback } from "@/routes/LocaleRouteFallback";
import { StorefrontErrorScreen, MaintenanceScreen } from "@/routes/LocaleShellScreens";
import { StorefrontBottomDock } from "@/components/layout/StorefrontBottomDock";
import { StorefrontWhatsAppFab } from "@/components/layout/StorefrontWhatsAppFab";
import { locales, defaultLocale, type AppLocale } from "@/navigation";

const Footer = lazy(() => import("@/components/layout/Footer").then((m) => ({ default: m.Footer })));

/** Stable empty catalog while the on-demand catalog query streams in. */
const EMPTY_CATALOG = { products: [], categories: [], brands: [] };

export function LocaleLayout() {
  const { locale: loc } = useParams<{ locale: string }>();
  const location = useLocation();
  const isKnownLocale = !!loc && locales.includes(loc as AppLocale);
  const locale = loc === "ar" ? "ar" : "en";
  const dir = locale === "ar" ? "rtl" : "ltr";
  const lc = locale;
  const apiKey = import.meta.env.VITE_API_URL ?? "";

  /**
   * Split bootstrap (docs/STOREFRONT_DESIGN.md §4.2) — one HTTP request,
   * two cache policies:
   * - shell (site/theme/home CMS): long cache + localStorage snapshot so the
   *   header/footer paint on the very first render for returning visitors.
   * - catalog: on-demand, short cache, no focus refetch (was staleTime: 0 +
   *   refetchOnWindowFocus: true — the whole app re-blocked on tab focus).
   */
  const { data: shell } = useQuery({
    queryKey: ["storefront-shell", lc, apiKey],
    queryFn: async () => shellFromBundle(await fetchStorefrontBootstrapShared(lc)),
    initialData: () => readShellSnapshot(lc),
    /** Snapshot paints instantly but is treated as stale → background refresh */
    initialDataUpdatedAt: 0,
    staleTime: 30 * 60_000,
    gcTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: bundle, isError, error } = useQuery({
    queryKey: ["storefront-catalog", lc, apiKey],
    queryFn: () => fetchStorefrontBootstrapShared(lc),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (bundle) writeShellSnapshot(lc, bundle);
  }, [bundle, lc]);

  useLayoutEffect(() => {
    setLocale(lc);
  }, [lc]);

  /** GA4/Pixel page_view per route change — no-op unless analytics IDs are configured. */
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;

  /**
   * Unknown first segment (typo or un-prefixed link like /cart) — bounce to the
   * default locale keeping the path, so it resolves to a real localized route or
   * the locale 404 instead of silently rendering the English homepage.
   */
  if (!isKnownLocale) {
    return <Navigate to={`/${defaultLocale}${location.pathname}${location.search}`} replace />;
  }

  if (isError && !bundle) {
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    return (
      <>
        <SetDocumentLocale locale={locale} dir={dir} />
        <StorefrontErrorScreen message={msg} />
      </>
    );
  }

  const site = bundle?.site ?? shell?.site;
  const home = bundle?.home ?? shell?.home;
  const theme = bundle?.theme ?? shell?.theme;

  /** True first visit (no snapshot, nothing fetched yet) — full-page skeleton */
  if (!site || !home || !theme) {
    return (
      <>
        <SetDocumentLocale locale={locale} dir={dir} />
        <LocaleRouteFallback />
      </>
    );
  }

  if (site.maintenanceMode) {
    return (
      <>
        <SetDocumentLocale locale={locale} dir={dir} />
        <MaintenanceScreen locale={locale} />
      </>
    );
  }

  const catalogReady = Boolean(bundle);

  return (
    <>
      <SetDocumentLocale locale={locale} dir={dir} />
      <StoreJsonLd site={site} locale={locale} baseUrl={baseUrl} />
      <div className="app-shell">
        <StorefrontPrefetch />
        <StorefrontProvider
          value={{
            site,
            home,
            catalog: bundle?.catalog ?? EMPTY_CATALOG,
            theme,
            homeSections: bundle?.homeSections ?? null,
          }}
        >
          <ThemeApplier tokens={theme}>
            <NavBar />
            <main className="app-main">
              {catalogReady ? (
                <PageTransition>
                  <Suspense fallback={<LocaleRouteFallback withChrome={false} />}>
                    <Outlet />
                  </Suspense>
                </PageTransition>
              ) : (
                /* Shell painted from cache — catalog still streaming in */
                <LocaleRouteFallback withChrome={false} />
              )}
            </main>
            <Suspense fallback={<footer style={{ minHeight: 80, flexShrink: 0 }} aria-hidden />}>
              <div style={{ flexShrink: 0 }}>
                <Footer />
              </div>
            </Suspense>
            <StorefrontBottomDock />
            <StorefrontWhatsAppFab />
          </ThemeApplier>
        </StorefrontProvider>
      </div>
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
    </>
  );
}
