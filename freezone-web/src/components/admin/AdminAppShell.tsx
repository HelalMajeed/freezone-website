"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  LayoutPanelTop,
  LayoutGrid,
  Images,
  Palette,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  TicketPercent,
  Gift,
  ExternalLink,
  LogOut,
  Store,
  History,
  PanelLeftClose,
  PanelLeft,
  Search,
  Plus,
  FileWarning,
  Filter,
  Settings,
  Languages,
  RefreshCw,
  Users,
  UserRound,
  Upload,
  Moon,
  Sun,
} from "lucide-react";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { AdminOnboardingTour } from "@/components/admin/AdminOnboardingTour";
import { isDarkMode, setDarkMode } from "@/lib/admin/admin-user-prefs";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import type { LegacyRoleAlias } from "@/lib/dashboard/api";
import { Avatar, Badge } from "@/components/dashboard/ui";
import s from "@/components/dashboard/layout.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
  minRole?: LegacyRoleAlias;
  badgeKey?: "pendingReview" | "newComments" | "categoriesNoAttrs";
};

function makeAdminNavGroups(t: TFunction): { label: string; items: NavItem[]; minRole?: LegacyRoleAlias }[] {
  return [
    {
      label: "لوحة التحكم",
      items: [{ href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard }],
    },
    {
      label: "الكتالوج",
      minRole: "editor",
      items: [
        { href: "/admin/categories", label: "الأقسام", icon: FolderTree, minRole: "editor", badgeKey: "categoriesNoAttrs" },
        { href: "/admin/products", label: "كل المنتجات", icon: Package, minRole: "editor" },
        { href: "/admin/import", label: "استيراد CSV", icon: Upload, minRole: "editor" },
        { href: "/admin/me", label: "صفحتي", icon: UserRound, minRole: "editor" },
        { href: "/admin/brands", label: "العلامات التجارية", icon: Tag, minRole: "editor" },
        { href: "/admin/media", label: "الوسائط", icon: Images, minRole: "editor" },
      ],
    },
    {
      label: "جودة الكتالوج",
      minRole: "editor",
      items: [
        { href: "/admin/data-quality", label: "جودة البيانات", icon: FileWarning, minRole: "editor" },
        { href: "/admin/classification", label: "أدوات التصنيف", icon: Filter, minRole: "editor" },
      ],
    },
    {
      label: "الموقع والمحتوى",
      minRole: "editor",
      items: [
        { href: "/admin/content", label: "بناء الصفحة الرئيسية", icon: LayoutGrid, minRole: "editor" },
        { href: "/admin/cms", label: "البانرات والإعدادات", icon: LayoutPanelTop, minRole: "editor" },
        { href: "/admin/design", label: "المظهر", icon: Palette, minRole: "editor" },
      ],
    },
    {
      label: "المبيعات",
      minRole: "admin",
      items: [
        { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart, minRole: "admin" },
        { href: "/admin/coupons", label: "الكوبونات", icon: TicketPercent, soon: true, minRole: "admin" },
        { href: "/admin/offers", label: t("AdminShell.navOffers"), icon: Gift, soon: true, minRole: "admin" },
      ],
    },
    {
      label: "النظام",
      minRole: "admin",
      items: [
        { href: "/admin/users", label: "الفريق والصلاحيات", icon: Users, minRole: "superadmin" },
        { href: "/admin/audit", label: "سجل النشاط", icon: History, minRole: "admin" },
        { href: "/admin/cms", label: "إعدادات الموقع", icon: Settings, minRole: "admin" },
      ],
    },
  ];
}

const SIDEBAR_KEY = "admin-sidebar-collapsed";

function isNavActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0] ?? href;
  if (base === "/admin") return pathname === "/admin";
  return pathname === base || pathname.startsWith(`${base}/`);
}

function breadcrumbTrail(pathname: string, flatNav: NavItem[]) {
  const normalized = pathname.replace(/\/+$/, "") || "/admin";
  const home = { href: "/admin", label: "لوحة التحكم" };
  if (normalized === "/admin") return [home];
  const match = flatNav
    .filter((item) => {
      const base = item.href.split("?")[0] ?? item.href;
      return base !== "/admin" && (normalized === base || normalized.startsWith(`${base}/`));
    })
    .sort((a, b) => (b.href.split("?")[0] ?? b.href).length - (a.href.split("?")[0] ?? a.href).length)[0];
  const trail: { href: string; label: string }[] = [home];
  if (match) trail.push({ href: match.href.split("?")[0] ?? match.href, label: match.label });
  if (match && normalized !== (match.href.split("?")[0] ?? match.href)) {
    if (normalized.includes("/categories/")) trail.push({ href: normalized, label: "إدارة القسم" });
    else if (normalized.includes("/edit/")) trail.push({ href: normalized, label: "تعديل منتج" });
    else if (normalized.includes("/new")) trail.push({ href: normalized, label: "منتج جديد" });
    else trail.push({ href: normalized, label: "تفاصيل" });
  }
  return trail;
}

export function AdminAppShell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const pathname = useLocation().pathname ?? "";
  const user = useDashboardAuth((s) => s.user);
  const logout = useDashboardAuth((s) => s.logout);
  const hasRole = useDashboardAuth((s) => s.hasRole);
  const notifications = useAdminNotifications(user != null);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDark(isDarkMode());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        navigate("/admin/products/new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "ar");
    return () => {
      document.documentElement.removeAttribute("dir");
      document.documentElement.removeAttribute("lang");
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const groups = useMemo(() => makeAdminNavGroups(t), [t]);
  const flatNav = useMemo(
    () =>
      groups.flatMap((g) =>
        g.items.filter((item) => !item.minRole || hasRole(item.minRole)),
      ),
    [groups, hasRole],
  );
  const crumbs = useMemo(() => breadcrumbTrail(pathname, flatNav), [pathname, flatNav]);
  const storeLocale = i18n.language.startsWith("ar") ? "/ar" : "/";

  const onLogout = useCallback(async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  }, [logout, navigate]);

  return (
    <div className="admin-shell dashboard-root">
      <div className="dashboard-shell" data-collapsed={collapsed ? "true" : "false"}>
        <aside className={s.sidebar} data-mobile-open={mobileOpen ? "true" : "false"}>
          <div className={s.brand}>
            <span className={s.brandMark}>
              <Store size={18} aria-hidden />
            </span>
            <div className={s.brandText}>
              <span className={s.brandName}>FreeZone</span>
              <span className={s.brandSub}>لوحة الإدارة</span>
            </div>
          </div>

          <nav>
            {groups.map((group) => {
              if (group.minRole && !hasRole(group.minRole)) return null;
              const visible = group.items.filter((item) => !item.minRole || hasRole(item.minRole));
              if (visible.length === 0) return null;
              return (
                <div key={group.label} className={s.navGroup}>
                  <div className={s.navGroupLabel}>{group.label}</div>
                  {visible.map((item) => {
                    const Icon = item.icon;
                    const hrefBase = item.href.split("?")[0] ?? item.href;
                    const badgeCount = item.badgeKey ? notifications[item.badgeKey] : 0;
                    return (
                      <NavLink
                        key={`${group.label}-${item.href}`}
                        to={item.href}
                        end={hrefBase === "/admin"}
                        className={({ isActive }) =>
                          [s.navItem, isActive || isNavActive(pathname, item.href) ? s.navItemActive : ""]
                            .filter(Boolean)
                            .join(" ")
                        }
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className={s.navIcon} aria-hidden>
                          <Icon size={16} strokeWidth={2} />
                        </span>
                        <span className={s.navLabel}>{item.label}</span>
                        {badgeCount > 0 ? (
                          <Badge tone="warning">{badgeCount > 99 ? "99+" : badgeCount}</Badge>
                        ) : null}
                        {item.soon ? <Badge tone="warning">قريبًا</Badge> : null}
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          <div className={s.navFooter}>
            <Link
              to={storeLocale}
              className={s.navItem}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
            >
              <span className={s.navIcon} aria-hidden>
                <ExternalLink size={16} />
              </span>
              <span className={s.navLabel}>عرض المتجر</span>
            </Link>
          </div>
        </aside>

        {mobileOpen ? <div className={s.mobileBackdrop} onClick={() => setMobileOpen(false)} /> : null}

        <div className="dashboard-main">
          <header className={s.topbar}>
            <div className={s.topbarLeft}>
              <button type="button" className={s.langToggle} aria-label="القائمة" onClick={() => setMobileOpen((v) => !v)}>
                ☰
              </button>
              <button type="button" className={s.langToggle} aria-label="طي القائمة" onClick={() => setCollapsed((c) => !c)}>
                {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <nav aria-label="مسار التنقل">
                <ol
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    fontSize: 12,
                    color: "var(--fz-text-muted)",
                  }}
                >
                  {crumbs.map((c, i) => (
                    <li key={`${c.href}-${i}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {i > 0 ? <span>/</span> : null}
                      {i < crumbs.length - 1 ? (
                        <Link to={c.href} style={{ color: "var(--fz-brand)" }}>
                          {c.label}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--fz-text)", fontWeight: 600 }}>{c.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            <div className={s.searchWrap} style={{ flex: 1, maxWidth: 360, marginInline: 12 }}>
              <span className={s.searchIcon} aria-hidden>
                <Search size={14} />
              </span>
              <input
                type="search"
                className={s.searchInput}
                placeholder="بحث في القائمة…"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
                  if (!q) return;
                  const hit = flatNav.find((item) => item.label.toLowerCase().includes(q));
                  if (hit) navigate(hit.href);
                }}
              />
            </div>

            <AdminGlobalSearch />

            <div className={s.topbarRight}>
              <button
                type="button"
                className={s.langToggle}
                title="وضع داكن"
                onClick={() => {
                  const next = !dark;
                  setDark(next);
                  setDarkMode(next);
                }}
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button type="button" className={s.langToggle} title="تحديث" onClick={() => window.location.reload()}>
                <RefreshCw size={16} />
              </button>
              <button
                type="button"
                className={s.langToggle}
                onClick={() => void i18n.changeLanguage(i18n.language.startsWith("ar") ? "en" : "ar")}
              >
                <Languages size={16} />
              </button>
              <Link className={s.langToggle} to={storeLocale} target="_blank" rel="noopener noreferrer" title="عرض المتجر">
                <Store size={16} />
              </Link>
              <Link className={s.langToggle} to="/admin/categories" title="إضافة منتج من قسم">
                <Plus size={16} />
              </Link>

              <div className={s.userMenu} ref={menuRef}>
                <button type="button" className={s.userBtn} onClick={() => setMenuOpen((v) => !v)}>
                  <Avatar name={user?.name ?? "?"} url={user?.avatarUrl} />
                  <span className={s.userBtnText}>{user?.name ?? "—"}</span>
                </button>
                {menuOpen && (
                  <div className={s.userMenuDropdown}>
                    <div className={s.userMenuHeader}>
                      <div className={s.userMenuName}>{user?.name}</div>
                      <div className={s.userMenuEmail}>{user?.email}</div>
                      {user?.role ? (
                        <div className={s.userMenuRole}>
                          <Badge tone="brand">{user.role}</Badge>
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={s.userMenuItem}
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/admin/profile");
                      }}
                    >
                      <UserRound size={14} />
                      <span>حسابي وكلمة المرور</span>
                    </button>
                    <div className={s.userMenuDivider} />
                    <button type="button" className={`${s.userMenuItem} ${s.userMenuItemDanger}`} onClick={() => void onLogout()}>
                      <LogOut size={14} />
                      <span>خروج</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="dashboard-content">
            <Outlet />
            <AdminOnboardingTour />
          </main>
        </div>
      </div>
    </div>
  );
}
