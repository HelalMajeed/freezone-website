import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { readPreferredLocale } from "@/lib/preferred-locale";
import { LocaleLayout } from "@/routes/LocaleLayout";
import { ConfirmDialogHost } from "@/components/ui/ConfirmDialog";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import HomePage from "@/pages/HomePage";
import ProductsPage from "@/pages/ProductsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import NotFoundPage from "@/pages/NotFoundPage";

const CartPage = lazy(() => import("@/app/locale/cart/page"));
const CheckoutPage = lazy(() => import("@/app/locale/checkout/page"));
const LoginPage = lazy(() => import("@/app/locale/login/page"));
const RegisterPage = lazy(() => import("@/app/locale/register/page"));
const AccountPage = lazy(() => import("@/app/locale/account/page"));
const AboutPage = lazy(() => import("@/app/locale/about/page"));
const ContactPage = lazy(() => import("@/app/locale/contact/page"));
const WishlistPage = lazy(() => import("@/app/locale/wishlist/page"));
const ComparePage = lazy(() => import("@/app/locale/compare/page"));
const TrackOrderPage = lazy(() => import("@/app/locale/track-order/page"));
const CategoryLandingPage = lazy(() => import("@/app/locale/landing/CategoryLandingPage"));
const BrandLandingPage = lazy(() => import("@/app/locale/landing/BrandLandingPage"));
const PolicyPageLazy = lazy(() =>
  import("@/app/locale/policies/PolicyPage").then((m) => ({ default: m.PolicyPage })),
);
const WarrantyPage = lazy(() => import("@/app/locale/warranty/page"));
const FaqPage = lazy(() => import("@/app/locale/faq/page"));
import PcBuilderPage from "@/app/locale/pc-builder/page";

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

      <Route path="/:locale" element={<LocaleLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="product/:id" element={<ProductDetailPage />} />
        <Route
          path="cart"
          element={
            <SuspensePage>
              <CartPage />
            </SuspensePage>
          }
        />
        <Route
          path="checkout"
          element={
            <SuspensePage>
              <CheckoutPage />
            </SuspensePage>
          }
        />
        <Route
          path="login"
          element={
            <SuspensePage>
              <LoginPage />
            </SuspensePage>
          }
        />
        <Route
          path="register"
          element={
            <SuspensePage>
              <RegisterPage />
            </SuspensePage>
          }
        />
        <Route
          path="account"
          element={
            <SuspensePage>
              <AccountPage />
            </SuspensePage>
          }
        />
        <Route
          path="about"
          element={
            <SuspensePage>
              <AboutPage />
            </SuspensePage>
          }
        />
        <Route
          path="contact"
          element={
            <SuspensePage>
              <ContactPage />
            </SuspensePage>
          }
        />
        <Route path="pc-builder" element={<PcBuilderPage />} />
        <Route
          path="wishlist"
          element={
            <SuspensePage>
              <WishlistPage />
            </SuspensePage>
          }
        />
        <Route
          path="compare"
          element={
            <SuspensePage>
              <ComparePage />
            </SuspensePage>
          }
        />
        <Route
          path="track-order"
          element={
            <SuspensePage>
              <TrackOrderPage />
            </SuspensePage>
          }
        />
        <Route
          path="category/:slug"
          element={
            <SuspensePage>
              <CategoryLandingPage />
            </SuspensePage>
          }
        />
        <Route
          path="brand/:slug"
          element={
            <SuspensePage>
              <BrandLandingPage />
            </SuspensePage>
          }
        />
        <Route
          path="shipping"
          element={
            <SuspensePage>
              <PolicyPageLazy kind="shipping" />
            </SuspensePage>
          }
        />
        <Route
          path="returns"
          element={
            <SuspensePage>
              <PolicyPageLazy kind="returns" />
            </SuspensePage>
          }
        />
        <Route
          path="privacy"
          element={
            <SuspensePage>
              <PolicyPageLazy kind="privacy" />
            </SuspensePage>
          }
        />
        <Route
          path="terms"
          element={
            <SuspensePage>
              <PolicyPageLazy kind="terms" />
            </SuspensePage>
          }
        />
        <Route
          path="warranty"
          element={
            <SuspensePage>
              <WarrantyPage />
            </SuspensePage>
          }
        />
        <Route
          path="faq"
          element={
            <SuspensePage>
              <FaqPage />
            </SuspensePage>
          }
        />
        {/* Locale-scoped 404 — keeps the storefront chrome + language. */}
        <Route path="*" element={<NotFoundPage />} />
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
