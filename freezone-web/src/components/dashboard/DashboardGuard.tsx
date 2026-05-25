import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";

/**
 * Wraps the authenticated portion of the dashboard. On first mount it calls
 * /api/dashboard/auth/me; while loading shows a spinner. If the request fails
 * the user is redirected to /dashboard/login (preserving the requested URL
 * so we can come back after login).
 */
export function DashboardGuard() {
  const status = useDashboardAuth((s) => s.status);
  const refresh = useDashboardAuth((s) => s.refresh);
  const location = useLocation();

  useEffect(() => {
    if (status === "idle") void refresh();
  }, [status, refresh]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="dashboard-root">
        <div className="dashboard-loader" aria-label="Loading" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/dashboard/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
