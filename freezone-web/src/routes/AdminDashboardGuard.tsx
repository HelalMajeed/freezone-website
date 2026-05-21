import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";

/**
 * Protects /admin/* — dashboard session or legacy fz_admin_session.
 */
export function AdminDashboardGuard() {
  const status = useDashboardAuth((s) => s.status);
  const refresh = useDashboardAuth((s) => s.refresh);
  const location = useLocation();

  useEffect(() => {
    if (status === "idle") void refresh();
  }, [status, refresh]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="admin-shell dashboard-root">
        <div className="dashboard-loader" aria-label="جاري التحميل" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
