import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const DashboardLoginPage = lazy(() => import("@/app/dashboard/LoginPage"));
const DashboardOverviewPage = lazy(() => import("@/pages/dashboard/OverviewPage"));
const DashboardUsersPage = lazy(() => import("@/pages/dashboard/UsersPage"));
const DashboardProfilePage = lazy(() => import("@/pages/dashboard/ProfilePage"));
const DashboardAuditPage = lazy(() => import("@/pages/dashboard/AuditPage"));
const DashboardBrandsPage = lazy(() => import("@/pages/dashboard/BrandsPage"));
const DashboardProductsPage = lazy(() => import("@/pages/dashboard/ProductsPage"));
const DashboardCategoriesPage = lazy(() => import("@/pages/dashboard/CategoriesPage"));
const DashboardOrdersPage = lazy(() => import("@/pages/dashboard/OrdersPage"));
const DashboardCouponsPage = lazy(() => import("@/pages/dashboard/CouponsPage"));
const DashboardMediaPage = lazy(() => import("@/pages/dashboard/MediaPage"));
const DashboardSettingsPage = lazy(() => import("@/pages/dashboard/SettingsPage"));
const DashboardDesignPage = lazy(() => import("@/pages/dashboard/DesignPage"));
const DashboardCmsPage = lazy(() => import("@/pages/dashboard/CmsPage"));
const DashboardDataQualityPage = lazy(() => import("@/pages/dashboard/DataQualityPage"));

/* ws3-catalog routes — lazy imports */
const DashboardProductEditorPage = lazy(
  () => import("@/pages/dashboard/products/editor/ProductEditorPage"),
);
const DashboardProductsImportPage = lazy(
  () => import("@/pages/dashboard/products/ImportWizardPage"),
);
const DashboardReviewQueuePage = lazy(
  () => import("@/pages/dashboard/products/ReviewQueuePage"),
);
const DashboardCategoryAttributesPage = lazy(
  () => import("@/pages/dashboard/categories/CategoryAttributesPage"),
);


function L({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="dashboard-loader" />}>{children}</Suspense>
  );
}

/**
 * Mount in `<Routes>`:
 *
 *   import { freezoneDashboardRouteBranch } from "@/routes/dashboard-routes";
 *   ...
 *   <Routes>
 *     {freezoneDashboardRouteBranch}
 *     ...
 *   </Routes>
 */
export const freezoneDashboardRouteBranch = (
  <Route path="/dashboard">
    <Route
      path="login"
      element={
        <L>
          <DashboardLoginPage />
        </L>
      }
    />
    <Route element={<DashboardGuard />}>
      <Route element={<DashboardLayout />}>
        <Route
          index
          element={
            <L>
              <DashboardOverviewPage />
            </L>
          }
        />
        <Route path="audit" element={<L><DashboardAuditPage /></L>} />
        <Route path="users" element={<L><DashboardUsersPage /></L>} />
        <Route path="profile" element={<L><DashboardProfilePage /></L>} />
        <Route path="products" element={<L><DashboardProductsPage /></L>} />
        <Route path="categories" element={<L><DashboardCategoriesPage /></L>} />
        <Route path="brands" element={<L><DashboardBrandsPage /></L>} />
        <Route path="orders" element={<L><DashboardOrdersPage /></L>} />
        <Route path="coupons" element={<L><DashboardCouponsPage /></L>} />
        <Route path="cms" element={<L><DashboardCmsPage /></L>} />
        <Route path="media" element={<L><DashboardMediaPage /></L>} />
        <Route path="design" element={<L><DashboardDesignPage /></L>} />
        <Route path="settings" element={<L><DashboardSettingsPage /></L>} />
        <Route path="data-quality" element={<L><DashboardDataQualityPage /></L>} />
        {/* ws3-catalog routes */}
        <Route path="products/new" element={<L><DashboardProductEditorPage /></L>} />
        <Route path="products/import" element={<L><DashboardProductsImportPage /></L>} />
        <Route path="products/review" element={<L><DashboardReviewQueuePage /></L>} />
        <Route path="products/:id" element={<L><DashboardProductEditorPage /></L>} />
        <Route path="categories/:id/attributes" element={<L><DashboardCategoryAttributesPage /></L>} />
        {/* end ws3-catalog routes */}
      </Route>
    </Route>
  </Route>
);
