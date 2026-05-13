import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function MainAdminSidebar() {
  const { t } = useTranslation();
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-4 truncate text-sm font-bold text-slate-900">{t("app.name")}</div>
      <nav className="flex flex-col gap-1">
        <NavLink
          to="/admin/offers"
          className={({ isActive }) =>
            `rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`
          }
        >
          {t("nav.offers")}
        </NavLink>
      </nav>
    </aside>
  );
}

export function AdminShell() {
  return (
    <div className="flex min-h-screen">
      <MainAdminSidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
