import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { Avatar, Badge } from "@/components/dashboard/ui";
import s from "./layout.module.css";

type NavGroupDef = {
  label: { en: string; ar: string };
  items: NavItemDef[];
  minRole?: "viewer" | "editor" | "admin" | "superadmin";
};

type NavItemDef = {
  to: string;
  label: { en: string; ar: string };
  icon: string;
  end?: boolean;
  minRole?: "viewer" | "editor" | "admin" | "superadmin";
};

/** Single source of truth for the sidebar navigation. */
const NAV: NavGroupDef[] = [
  {
    label: { en: "Overview", ar: "نظرة عامة" },
    items: [
      { to: "/dashboard", end: true, label: { en: "Dashboard", ar: "اللوحة" }, icon: "▦" },
      { to: "/dashboard/audit", label: { en: "Activity", ar: "السجل" }, icon: "≡" },
    ],
  },
  {
    label: { en: "Catalog", ar: "الكتالوج" },
    items: [
      { to: "/dashboard/products", label: { en: "Products", ar: "المنتجات" }, icon: "▢" },
      { to: "/dashboard/categories", label: { en: "Categories", ar: "الأقسام" }, icon: "▣" },
      { to: "/dashboard/brands", label: { en: "Brands", ar: "العلامات" }, icon: "★" },
    ],
  },
  {
    label: { en: "Commerce", ar: "المبيعات" },
    items: [
      { to: "/dashboard/orders", label: { en: "Orders", ar: "الطلبات" }, icon: "⛟", minRole: "admin" },
      { to: "/dashboard/coupons", label: { en: "Coupons", ar: "الكوبونات" }, icon: "%", minRole: "admin" },
    ],
  },
  {
    label: { en: "Content", ar: "المحتوى" },
    items: [
      { to: "/dashboard/cms", label: { en: "Pages", ar: "الصفحات" }, icon: "❐" },
      { to: "/dashboard/media", label: { en: "Media library", ar: "الوسائط" }, icon: "▤" },
      { to: "/dashboard/design", label: { en: "Design & theme", ar: "التصميم" }, icon: "◐" },
    ],
  },
  {
    label: { en: "System", ar: "النظام" },
    minRole: "superadmin",
    items: [
      { to: "/dashboard/users", label: { en: "Team & roles", ar: "الفريق والصلاحيات" }, icon: "♟", minRole: "superadmin" },
      { to: "/dashboard/settings", label: { en: "Site settings", ar: "إعدادات الموقع" }, icon: "⚙", minRole: "admin" },
    ],
  },
];

export function DashboardLayout() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useDashboardAuth((s) => s.user);
  const logout = useDashboardAuth((s) => s.logout);
  const hasRole = useDashboardAuth((s) => s.hasRole);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const lang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    // Apply dir to root element while dashboard is mounted
    const prev = document.documentElement.getAttribute("dir");
    document.documentElement.setAttribute("dir", dir);
    return () => {
      if (prev) document.documentElement.setAttribute("dir", prev);
      else document.documentElement.removeAttribute("dir");
    };
  }, [dir]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const onLogout = async () => {
    await logout();
    navigate("/dashboard/login", { replace: true });
  };

  const onToggleLang = () => {
    void i18n.changeLanguage(lang === "ar" ? "en" : "ar");
  };

  return (
    <div className="dashboard-root">
      <div className="dashboard-shell">
        {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className={s.sidebar} data-mobile-open={mobileOpen ? "true" : "false"}>
          <div className={s.brand}>
            <span className={s.brandMark}>F</span>
            <div className={s.brandText}>
              <span className={s.brandName}>Freezone</span>
              <span className={s.brandSub}>{lang === "ar" ? "لوحة التحكم" : "Dashboard"}</span>
            </div>
          </div>

          <nav>
            {NAV.map((group, gi) => {
              if (group.minRole && !hasRole(group.minRole)) return null;
              const visibleItems = group.items.filter((it) => !it.minRole || hasRole(it.minRole));
              if (visibleItems.length === 0) return null;
              return (
                <div key={gi} className={s.navGroup}>
                  <div className={s.navGroupLabel}>{group.label[lang]}</div>
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        [s.navItem, isActive && s.navItemActive].filter(Boolean).join(" ")
                      }
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className={s.navIcon} aria-hidden>
                        {item.icon}
                      </span>
                      <span className={s.navLabel}>{item.label[lang]}</span>
                    </NavLink>
                  ))}
                </div>
              );
            })}
          </nav>

          <div className={s.navFooter}>
            <div className={s.navItem} style={{ cursor: "default", color: "var(--fz-text-muted)", fontSize: 11 }}>
              v1.0 · {lang === "ar" ? "بُنيت لأجلك" : "built for you"}
            </div>
          </div>
        </aside>

        {mobileOpen && <div className={s.mobileBackdrop} onClick={() => setMobileOpen(false)} />}

        {/* ─── Main ────────────────────────────────────────────────────────── */}
        <div className="dashboard-main">
          <header className={s.topbar}>
            <div className={s.topbarLeft}>
              <button
                className={s.langToggle}
                onClick={() => setMobileOpen((v) => !v)}
                style={{ display: "none" }}
                aria-label="Menu"
              >
                ☰
              </button>
              <div className={s.searchWrap}>
                <span className={s.searchIcon}>⌕</span>
                <input
                  type="search"
                  className={s.searchInput}
                  placeholder={lang === "ar" ? "بحث سريع…" : "Quick search…"}
                />
              </div>
            </div>

            <div className={s.topbarRight}>
              <button className={s.langToggle} onClick={onToggleLang} aria-label="Toggle language">
                {lang === "ar" ? "EN" : "ع"}
              </button>

              <div className={s.userMenu} ref={menuRef}>
                <button className={s.userBtn} onClick={() => setMenuOpen((v) => !v)}>
                  <Avatar name={user?.name ?? "?"} url={user?.avatarUrl} />
                  <span className={s.userBtnText}>{user?.name ?? "—"}</span>
                </button>

                {menuOpen && (
                  <div className={s.userMenuDropdown}>
                    <div className={s.userMenuHeader}>
                      <div className={s.userMenuName}>{user?.name}</div>
                      <div className={s.userMenuEmail}>{user?.email}</div>
                      <div className={s.userMenuRole}>
                        <Badge tone="brand">{user?.role}</Badge>
                      </div>
                    </div>
                    <button
                      className={s.userMenuItem}
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/dashboard/profile");
                      }}
                    >
                      <span>◉</span>
                      <span>{lang === "ar" ? "حسابي وكلمة السر" : "Profile & password"}</span>
                    </button>
                    <div className={s.userMenuDivider} />
                    <button className={`${s.userMenuItem} ${s.userMenuItemDanger}`} onClick={onLogout}>
                      <span>⤳</span>
                      <span>{lang === "ar" ? "تسجيل الخروج" : "Sign out"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="dashboard-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
