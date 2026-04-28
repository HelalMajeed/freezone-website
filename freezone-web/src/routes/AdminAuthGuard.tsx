import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { getApiInternalBase, getInternalApiFetchSignal } from "@/lib/api-internal";

export function AdminAuthGuard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-auth-check"],
    queryFn: async () => {
      const base = getApiInternalBase();
      const res = await fetch(`${base}/api/admin/dashboard-stats`, {
        credentials: "include",
        cache: "no-store",
        signal: getInternalApiFetchSignal(),
      });
      if (res.status === 401) return false;
      return res.ok;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
        جاري التحقق من الجلسة…
      </div>
    );
  }
  if (data === false) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}
