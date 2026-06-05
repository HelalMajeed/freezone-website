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
