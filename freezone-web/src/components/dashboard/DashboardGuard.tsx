import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { DASHBOARD_UNAUTHORIZED_EVENT } from "@/lib/dashboard/api";

/**
 * Wraps the authenticated portion of the dashboard. On first mount it calls
 * /api/dashboard/auth/me; while loading shows a spinner. If the request fails
 * the user is redirected to /dashboard/login (preserving the requested URL
 * so we can come back after login).
 *
 * It also listens for {@link DASHBOARD_UNAUTHORIZED_EVENT}, dispatched by the
 * API client on any 401. When the session cookie expires mid-use this flips
 * the auth store to "unauthenticated", so the next render redirects to login
 * instead of leaving the admin stuck behind cryptic "UNAUTHORIZED" toasts.
 */
export function DashboardGuard() {
  const status = useDashboardAuth((s) => s.status);
  const refresh = useDashboardAuth((s) => s.refresh);
  const location = useLocation();

  useEffect(() => {
    if (status === "idle") void refresh();
  }, [status, refresh]);

  useEffect(() => {
    const onUnauthorized = () => {
      const { status: current } = useDashboardAuth.getState();
      if (current === "authenticated") {
        useDashboardAuth.setState({ status: "unauthenticated", user: null });
      }
    };
    window.addEventListener(DASHBOARD_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(DASHBOARD_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

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
