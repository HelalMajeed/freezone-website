import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { readPreferredLocale } from "@/lib/preferred-locale";
import { SiteLayout } from "@/site/SiteLayout";
import { ConfirmDialogHost } from "@/components/ui/ConfirmDialog";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import HomePage from "@/pages/HomePage";
import ProductsListPage from "@/site/ProductsListPage";
import ProductPage from "@/site/ProductPage";
import SiteNotFound from "@/site/SiteNotFound";

/**
 * The entire admin panel (guard, layout, ui kit, auth store, dashboard i18n)
 * behind ONE lazy boundary so the storefront bundle ships none of it.
 */
const AdminApp = lazy(() => import("@/routes/dashboard-routes"));

function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ padding: 48, textAlign: "center" }}>…</div>}>{children}</Suspense>;
}

/**
 * Path-preserving bridge for legacy `/dashboard/*` URLs — bookmarks and DB
 * notification hrefs (`/dashboard/orders/1042`) keep working after the move
 * to the canonical `/admin/*` prefix.
 */
function LegacyDashboardRedirect() {
  const location = useLocation();
  const target =
    location.pathname.replace(/^\/dashboard(?=\/|$)/, "/admin") + location.search + location.hash;
  return <Navigate to={target} replace />;
}

/**
 * Bare "/" (and non-locale unknown paths) → the visitor's persisted language
 * choice, Arabic by default (A-18). Read at redirect time — not module scope —
 * so an explicit switch in the same tab is honored without a reload, and the
 * SSR-less first paint stays a plain client-side <Navigate>.
 */
function RootLocaleRedirect() {
  const location = useLocation();
  return <Navigate to={`/${readPreferredLocale()}${location.search}`} replace />;
}

export default function App() {
  const { pathname } = useLocation();

  /**
   * The admin branch is selected by PATHNAME, not by route ranking: React
   * Router scores static children of `/:locale` (e.g. `/:locale/login`,
   * `/:locale/products`) above the `/admin/*` splat, so `/admin/login` and
   * `/admin/products` would mount the storefront with locale="admin" and
   * dead-end on the locale 404. Branching here makes /admin un-hijackable
   * no matter what storefront routes are added later.
   */
  if (/^\/admin(\/|$)/.test(pathname)) {
    return (
      <ErrorBoundary>
        <Routes>
          <Route path="/admin/*" element={<SuspensePage><AdminApp /></SuspensePage>} />
        </Routes>
        <ConfirmDialogHost />
      </ErrorBoundary>
    );
  }
  if (/^\/dashboard(\/|$)/.test(pathname)) {
    return <LegacyDashboardRedirect />;
  }

  return (
    <>
    <ErrorBoundary>
    <Routes>
      <Route path="/" element={<RootLocaleRedirect />} />

      {/*
        The storefront is the static site in src/site: home, product list and
        product page. The earlier API-driven pages (cart, checkout, accounts,
        order tracking, category/brand landings, policies…) are no longer routed;
        their old addresses are redirected in public/_redirects.
      */}
      <Route path="/:locale" element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsListPage />} />
        <Route path="product/:id" element={<ProductPage />} />
        {/* Locale-scoped 404 — keeps the storefront chrome + language. */}
        <Route path="*" element={<SiteNotFound />} />
      </Route>

      {/* /admin and /dashboard are handled by the pathname branch above. */}

      {/* Non-locale unknown paths bounce to the preferred-locale root. */}
      <Route path="*" element={<RootLocaleRedirect />} />
    </Routes>
    <ConfirmDialogHost />
    </ErrorBoundary>
    </>
  );
}
