import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Lock } from "lucide-react";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button, EmptyState } from "@/components/dashboard/ui";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { applyDashboardLangDefault, useDashboardLocale } from "@/lib/dashboard/i18n";
import type { LegacyRoleAlias } from "@/lib/dashboard/api";
import "@/app/dashboard/dashboard-shell.css";

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
const DashboardCustomersPage = lazy(() => import("@/pages/dashboard/CustomersPage"));
const DashboardReviewsModerationPage = lazy(
  () => import("@/pages/dashboard/ReviewsModerationPage"),
);

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

/* ws3-operations lazy pages */
const DashboardOrderDetailPage = lazy(() => import("@/pages/dashboard/orders/OrderDetailPage"));
const DashboardNotificationsPage = lazy(() => import("@/pages/dashboard/NotificationsPage"));


function L({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="dashboard-loader" />}>{children}</Suspense>
  );
}

/**
 * Per-route role gate — defense-in-depth alongside the API permission checks.
 * The sidebar already hides links a user can't use; this stops a lower-privilege
 * admin (e.g. a CATALOG_EDITOR) from mounting a privileged page via a direct URL
 * and landing in a broken error state. Renders an explicit not-authorized panel
 * (mirrors the same minRole map as the NAV).
 */
function RequireRole({ minRole, children }: { minRole: LegacyRoleAlias; children: ReactNode }) {
  // Subscribe to `user` so the gate re-evaluates if the session/role changes.
  const user = useDashboardAuth((s) => s.user);
  const hasRole = useDashboardAuth((s) => s.hasRole);
  const { t } = useDashboardLocale();

  if (user && hasRole(minRole)) return <>{children}</>;

  return (
    <EmptyState
      icon={<Lock size={26} />}
      title={t("guard.notAuthorizedTitle")}
      description={t("guard.notAuthorizedBody")}
      action={
        <Link to="/admin">
          <Button type="button">{t("guard.backToDashboard")}</Button>
        </Link>
      }
    />
  );
}

/**
 * The whole admin panel behind ONE lazy boundary — App.tsx mounts it as
 *
 *   const AdminApp = lazy(() => import("@/routes/dashboard-routes"));
 *   ...
 *   <Route path="/admin/*" element={<Suspense ...><AdminApp /></Suspense>} />
 *
 * so the dashboard shell (guard, layout, ui kit, auth store, i18n catalogs,
 * shell CSS) ships in its own chunk instead of the storefront bundle. All
 * route paths below are relative to the canonical `/admin` prefix; legacy
 * `/dashboard/*` URLs are redirected path-preserving in App.tsx.
 */
export default function AdminApp() {
  // Arabic-first: the dashboard opens in Arabic unless the admin chose a
  // language before (their persisted toggle always wins).
  useEffect(() => {
    applyDashboardLangDefault();
  }, []);

  return (
    <Routes>
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
          <Route path="audit" element={<RequireRole minRole="superadmin"><L><DashboardAuditPage /></L></RequireRole>} />
          <Route path="users" element={<RequireRole minRole="superadmin"><L><DashboardUsersPage /></L></RequireRole>} />
          <Route path="profile" element={<L><DashboardProfilePage /></L>} />
          <Route path="products" element={<L><DashboardProductsPage /></L>} />
          <Route path="categories" element={<L><DashboardCategoriesPage /></L>} />
          <Route path="brands" element={<L><DashboardBrandsPage /></L>} />
          <Route path="orders" element={<RequireRole minRole="admin"><L><DashboardOrdersPage /></L></RequireRole>} />
          <Route path="coupons" element={<RequireRole minRole="admin"><L><DashboardCouponsPage /></L></RequireRole>} />
          <Route path="customers" element={<RequireRole minRole="admin"><L><DashboardCustomersPage /></L></RequireRole>} />
          <Route path="reviews" element={<RequireRole minRole="admin"><L><DashboardReviewsModerationPage /></L></RequireRole>} />
          <Route path="cms" element={<L><DashboardCmsPage /></L>} />
          <Route path="media" element={<L><DashboardMediaPage /></L>} />
          <Route path="design" element={<L><DashboardDesignPage /></L>} />
          <Route path="settings" element={<RequireRole minRole="admin"><L><DashboardSettingsPage /></L></RequireRole>} />
          <Route path="data-quality" element={<L><DashboardDataQualityPage /></L>} />
          {/* ws3-catalog routes */}
          <Route path="products/new" element={<L><DashboardProductEditorPage /></L>} />
          <Route path="products/import" element={<L><DashboardProductsImportPage /></L>} />
          <Route path="products/review" element={<RequireRole minRole="admin"><L><DashboardReviewQueuePage /></L></RequireRole>} />
          <Route path="products/:id" element={<L><DashboardProductEditorPage /></L>} />
          <Route path="categories/:id/attributes" element={<L><DashboardCategoryAttributesPage /></L>} />
          {/* end ws3-catalog routes */}
          {/* ws3-operations routes */}
          <Route path="orders/:id" element={<RequireRole minRole="admin"><L><DashboardOrderDetailPage /></L></RequireRole>} />
          <Route path="notifications" element={<L><DashboardNotificationsPage /></L>} />
          {/* /ws3-operations routes */}
          {/* Unknown /admin/* paths land on the dashboard home. */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
