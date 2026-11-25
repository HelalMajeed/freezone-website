import { Suspense, useEffect, useLayoutEffect } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import { setLocale } from "@/i18n/i18n";
import { trackPageView } from "@/lib/analytics";
import { readPreferredLocale } from "@/lib/preferred-locale";
import { publicSiteBaseUrl } from "@/components/seo/Seo";
import { safeJsonLd } from "@/components/seo/jsonLd";
import { INSTAGRAM_URL } from "./contact";
import { CartPanel } from "./CartPanel";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import styles from "./site.module.css";

/** Organization + WebSite structured data (the same block the build-time prerender writes). */
function SiteJsonLd({ locale }: { locale: "ar" | "en" }) {
  const base = publicSiteBaseUrl();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: "FreeZone",
        url: base,
        logo: `${base}/site/logo.svg`,
        sameAs: [INSTAGRAM_URL],
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: "FreeZone",
        inLanguage: locale === "ar" ? "ar-IQ" : "en-IQ",
        publisher: { "@id": `${base}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${base}/${locale}/products/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />;
}

/**
 * Storefront shell: header, page, footer, cart. Everything it shows is shipped
 * with the site (src/site/data) — it makes no API request, so the store renders
 * the same whether or not the API is up.
 */
export function SiteLayout() {
  const { locale: loc } = useParams<{ locale: string }>();
  const location = useLocation();
  const isKnownLocale = loc === "ar" || loc === "en";
  const locale = loc === "ar" ? "ar" : "en";

  useLayoutEffect(() => {
    if (isKnownLocale) setLocale(locale);
  }, [isKnownLocale, locale]);

  /** GA4/Pixel page_view per route change — no-op unless analytics IDs are configured. */
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  /**
   * Header and footer link to parts of the home page (/ar#brands). The home page
   * is a lazy chunk and ScrollToTop pins new routes to the top for a moment, so
   * wait for both before scrolling to the section.
   */
  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!id) return;
    let tries = 0;
    let timer = window.setTimeout(function seek() {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: "start" });
      else if (++tries < 30) timer = window.setTimeout(seek, 100);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash, location.key]);

  /**
   * Unknown first segment (typo or un-prefixed link like /products) — bounce to the
   * visitor's preferred locale (Arabic default) keeping the path.
   */
  if (!isKnownLocale) {
    return <Navigate to={`/${readPreferredLocale()}${location.pathname}${location.search}`} replace />;
  }

  return (
    <div className={styles.site}>
      <SiteJsonLd locale={locale} />
      <SiteHeader />
      <main className={styles.main}>
        <Suspense fallback={<div className={styles.pageFallback} aria-hidden="true" />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
      <CartPanel />
    </div>
  );
}
