import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { AdminAuthGuard } from "@/routes/AdminAuthGuard";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { AdminAppShell } from "@/components/admin/AdminAppShell";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";

const AdminLoginPage = lazy(() => import("@/app/admin/login/page"));
const AdminCmsPage = lazy(() => import("@/app/admin/(secure)/cms/page"));
const AdminContentPage = lazy(() => import("@/app/admin/(secure)/content/page"));
const AdminProductsPage = lazy(() => import("@/app/admin/(secure)/products/page"));
const AdminNewProductPage = lazy(() => import("@/app/admin/(secure)/products/new/page"));
const AdminProductEditPage = lazy(() => import("@/app/admin/(secure)/products/edit/[id]/page"));
const AdminCategoriesPage = lazy(() => import("@/app/admin/(secure)/categories/page"));
const AdminCategoryAttributesPage = lazy(
  () => import("@/app/admin/(secure)/categories/[id]/attributes/page"),
);
const AdminBrandsPage = lazy(() => import("@/app/admin/(secure)/brands/page"));
const AdminOrdersPage = lazy(() => import("@/app/admin/(secure)/orders/page"));
const AdminCouponsPage = lazy(() => import("@/app/admin/(secure)/coupons/page"));
const AdminMediaPage = lazy(() => import("@/app/admin/(secure)/media/page"));
const AdminDesignPage = lazy(() => import("@/app/admin/(secure)/design/page"));
const AdminAuditPage = lazy(() => import("@/app/admin/(secure)/audit/page"));
const AdminOffersPage = lazy(() => import("@/app/admin/(secure)/offers/page"));

function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ padding: 48, textAlign: "center" }}>…</div>}>{children}</Suspense>;
}

/**
 * Full `/admin` route branch (shared by storefront `App` and `apps/admin-vite`).
 * Must be a `<Route>` element tree, not a wrapper component, so React Router registers children.
 */
export const freezoneAdminRouteBranch = (
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
          path="categories/:id/attributes"
          element={
            <SuspensePage>
              <AdminCategoryAttributesPage />
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
        <Route
          path="offers"
          element={
            <SuspensePage>
              <AdminOffersPage />
            </SuspensePage>
          }
        />
      </Route>
    </Route>
  </Route>
);
