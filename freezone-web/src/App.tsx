import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LocaleLayout } from "@/routes/LocaleLayout";
import { freezoneDashboardRouteBranch } from "@/routes/dashboard-routes";
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
import PcBuilderPage from "@/app/locale/pc-builder/page";

function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ padding: 48, textAlign: "center" }}>…</div>}>{children}</Suspense>;
}

export default function App() {
  return (
    <>
    <ErrorBoundary>
    <Routes>
      <Route path="/" element={<Navigate to="/en" replace />} />

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
        {/* Locale-scoped 404 — keeps the storefront chrome + language. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {freezoneDashboardRouteBranch}

      {/* Legacy /admin paths now point at the official /dashboard panel. */}
      <Route path="/admin" element={<Navigate to="/dashboard/login" replace />} />
      <Route path="/admin/*" element={<Navigate to="/dashboard/login" replace />} />

      {/* Non-locale unknown paths bounce to the default locale root. */}
      <Route path="*" element={<Navigate to="/en" replace />} />
    </Routes>
    <ConfirmDialogHost />
    </ErrorBoundary>
    </>
  );
}
