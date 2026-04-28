import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LocaleLayout } from "@/routes/LocaleLayout";
import { AdminAuthGuard } from "@/routes/AdminAuthGuard";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { AdminAppShell } from "@/components/admin/AdminAppShell";
import HomePage from "@/pages/HomePage";
import ProductsPage from "@/pages/ProductsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";

const CartPage = lazy(() => import("@/app/locale/cart/page"));
const CheckoutPage = lazy(() => import("@/app/locale/checkout/page"));
const LoginPage = lazy(() => import("@/app/locale/login/page"));
const RegisterPage = lazy(() => import("@/app/locale/register/page"));
const AccountPage = lazy(() => import("@/app/locale/account/page"));
const AboutPage = lazy(() => import("@/app/locale/about/page"));
const ContactPage = lazy(() => import("@/app/locale/contact/page"));
import PcBuilderPage from "@/app/locale/pc-builder/page";
const AdminLoginPage = lazy(() => import("@/app/admin/login/page"));
const AdminCmsPage = lazy(() => import("@/app/admin/(secure)/cms/page"));
const AdminContentPage = lazy(() => import("@/app/admin/(secure)/content/page"));
const AdminProductsPage = lazy(() => import("@/app/admin/(secure)/products/page"));
const AdminNewProductPage = lazy(() => import("@/app/admin/(secure)/products/new/page"));
const AdminProductEditPage = lazy(() => import("@/app/admin/(secure)/products/edit/[id]/page"));
const AdminCategoriesPage = lazy(() => import("@/app/admin/(secure)/categories/page"));
const AdminBrandsPage = lazy(() => import("@/app/admin/(secure)/brands/page"));
const AdminOrdersPage = lazy(() => import("@/app/admin/(secure)/orders/page"));
const AdminCouponsPage = lazy(() => import("@/app/admin/(secure)/coupons/page"));
const AdminMediaPage = lazy(() => import("@/app/admin/(secure)/media/page"));
const AdminDesignPage = lazy(() => import("@/app/admin/(secure)/design/page"));
const AdminAuditPage = lazy(() => import("@/app/admin/(secure)/audit/page"));

function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ padding: 48, textAlign: "center" }}>…</div>}>{children}</Suspense>;
}

export default function App() {
  return (
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
      </Route>

      <Route path="/admin" element={<AdminChrome />}>
        <Route
          path="login"
          element={
            <SuspensePage>
              <AdminLoginPage />
            </SuspensePage>
          }
        />
        <Route element={<AdminAuthGuard />}>
          <Route element={<AdminAppShell />}>
            <Route index element={<AdminDashboardPage />} />
            <Route
              path="cms"
              element={
                <SuspensePage>
                  <AdminCmsPage />
                </SuspensePage>
              }
            />
            <Route
              path="content"
              element={
                <SuspensePage>
                  <AdminContentPage />
                </SuspensePage>
              }
            />
            <Route
              path="products/new"
              element={
                <SuspensePage>
                  <AdminNewProductPage />
                </SuspensePage>
              }
            />
            <Route
              path="products/edit/:id"
              element={
                <SuspensePage>
                  <AdminProductEditPage />
                </SuspensePage>
              }
            />
            <Route
              path="products"
              element={
                <SuspensePage>
                  <AdminProductsPage />
                </SuspensePage>
              }
            />
            <Route
              path="categories"
              element={
                <SuspensePage>
                  <AdminCategoriesPage />
                </SuspensePage>
              }
            />
            <Route
              path="brands"
              element={
                <SuspensePage>
                  <AdminBrandsPage />
                </SuspensePage>
              }
            />
            <Route
              path="orders"
              element={
                <SuspensePage>
                  <AdminOrdersPage />
                </SuspensePage>
              }
            />
            <Route
              path="coupons"
              element={
                <SuspensePage>
                  <AdminCouponsPage />
                </SuspensePage>
              }
            />
            <Route
              path="media"
              element={
                <SuspensePage>
                  <AdminMediaPage />
                </SuspensePage>
              }
            />
            <Route
              path="design"
              element={
                <SuspensePage>
                  <AdminDesignPage />
                </SuspensePage>
              }
            />
            <Route
              path="audit"
              element={
                <SuspensePage>
                  <AdminAuditPage />
                </SuspensePage>
              }
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/en" replace />} />
    </Routes>
  );
}
