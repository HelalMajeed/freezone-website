import { Suspense, lazy, useLayoutEffect } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
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
        <div className="container" style={{ padding: "80px 20px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: 16 }}>Unable to load the store</h1>
          <p style={{ marginBottom: 12, color: "#64748b" }}>تعذر تحميل المتجر.</p>
          <p style={{ marginBottom: 20, lineHeight: 1.5, color: "#334155" }}>
            The storefront could not load catalog data from the API. Check Netlify{" "}
            <code style={{ fontSize: "0.85em" }}>VITE_API_URL</code> (origin only, no <code>/api</code> suffix), then
            clear cache and redeploy.
          </p>
          <pre
            style={{
              textAlign: "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              padding: 16,
              background: "#f1f5f9",
              borderRadius: 8,
              fontSize: "0.8rem",
            }}
          >
            {msg}
          </pre>
        </div>
      </>
    );
  }

  const { site, home, catalog, homeSections, theme } = bundle;

  if (site.maintenanceMode) {
    return (
      <>
        <SetDocumentLocale locale={locale} dir={dir} />
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            textAlign: "center",
            background: "#0f172a",
            color: "#e2e8f0",
          }}
        >
          <h1 style={{ fontSize: "1.75rem", marginBottom: 12 }}>الموقع تحت الصيانة</h1>
          <p style={{ maxWidth: 420, lineHeight: 1.6, color: "#94a3b8" }}>
            نعمل على تحسين تجربتكم. يمكن للمسؤولين الاستمرار في لوحة التحكم على{" "}
            <Link to="/dashboard" style={{ color: "#f87171" }}>
              /dashboard
            </Link>
            .
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <SetDocumentLocale locale={locale} dir={dir} />
      <StoreJsonLd site={site} locale={locale} baseUrl={baseUrl} />
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
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
