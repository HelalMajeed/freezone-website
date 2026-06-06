import { Suspense, lazy, useLayoutEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { NavBar } from "@/components/layout/NavBar";
import { SetDocumentLocale } from "@/components/providers/SetDocumentLocale";
import { PageTransition } from "@/components/motion/PageTransition";
import { fetchStorefrontBootstrap } from "@/lib/storefront-bootstrap";
import { StorefrontProvider } from "@/components/providers/StorefrontProvider";
import { ThemeApplier } from "@/components/providers/ThemeApplier";
import { StoreJsonLd } from "@/components/seo/StoreJsonLd";
import { StorefrontPrefetch } from "@/components/storefront/StorefrontPrefetch";
import { setLocale } from "@/i18n/i18n";
import { LocaleRouteFallback } from "@/routes/LocaleRouteFallback";
import { StorefrontErrorScreen, MaintenanceScreen } from "@/routes/LocaleShellScreens";
import { StorefrontBottomDock } from "@/components/layout/StorefrontBottomDock";
import { StorefrontWhatsAppFab } from "@/components/layout/StorefrontWhatsAppFab";

const Footer = lazy(() => import("@/components/layout/Footer").then((m) => ({ default: m.Footer })));

export function LocaleLayout() {
  const { locale: loc } = useParams<{ locale: string }>();
  const locale = loc === "ar" ? "ar" : "en";
  const dir = locale === "ar" ? "rtl" : "ltr";
  const lc = locale;

  const { data: bundle, isLoading, isError, error } = useQuery({
    queryKey: ["storefront-bootstrap", lc, import.meta.env.VITE_API_URL ?? ""],
    queryFn: () => fetchStorefrontBootstrap(lc),
    /** Homepage/CMS/catalog can change in admin — avoid long-lived stale UI vs API (see Netlify cache + VITE_API_URL). */
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  useLayoutEffect(() => {
    setLocale(lc);
  }, [lc]);

  const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;

  if (isLoading && !bundle) {
    return (
      <>
        <SetDocumentLocale locale={locale} dir={dir} />
        <LocaleRouteFallback />
      </>
    );
  }

  if (isError || !bundle) {
    const msg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    return (
      <>
        <SetDocumentLocale locale={locale} dir={dir} />
        <StorefrontErrorScreen message={msg} />
      </>
    );
  }

  const { site, home, catalog, homeSections, theme } = bundle;

  if (site.maintenanceMode) {
    return (
      <>
        <SetDocumentLocale locale={locale} dir={dir} />
        <MaintenanceScreen locale={locale} />
      </>
    );
  }

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
            catalog: catalog,
            theme,
            homeSections,
          }}
        >
          <ThemeApplier tokens={theme}>
            <NavBar />
            <main className="app-main">
              <PageTransition>
                <Suspense fallback={<LocaleRouteFallback />}>
                  <Outlet />
                </Suspense>
              </PageTransition>
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
