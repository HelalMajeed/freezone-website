"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { freezoneApiUrl } from "@/lib/api-internal";
import { Badge } from "@/components/dashboard/ui";
import s from "@/components/dashboard/layout.module.css";

type NavItem = { href: string; label: string; icon: LucideIcon; soon?: boolean };

function makeAdminNavGroups(t: TFunction): { label: string; items: NavItem[] }[] {
  return [
    {
      label: "لوحة التحكم",
      items: [{ href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard }],
    },
    {
      label: "الكتالوج",
      items: [
        { href: "/admin/categories", label: "الأقسام", icon: FolderTree },
        { href: "/admin/products", label: "كل المنتجات", icon: Package },
        { href: "/admin/brands", label: "العلامات التجارية", icon: Tag },
        { href: "/admin/media", label: "الوسائط", icon: Images },
      ],
    },
    {
      label: "جودة الكتالوج",
      items: [
        { href: "/admin/data-quality", label: "جودة البيانات", icon: FileWarning },
        { href: "/admin/classification", label: "أدوات التصنيف", icon: Filter },
        { href: "/admin/data-quality?tab=invalid_filters", label: "صحة الفلاتر", icon: Filter },
      ],
    },
    {
      label: "الموقع والمحتوى",
      items: [
        { href: "/admin/content", label: "بناء الصفحة الرئيسية", icon: LayoutGrid },
        { href: "/admin/cms", label: "البانرات والإعدادات", icon: LayoutPanelTop },
        { href: "/admin/design", label: "المظهر", icon: Palette },
      ],
    },
    {
      label: "المبيعات",
      items: [
        { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart },
        { href: "/admin/coupons", label: "الكوبونات", icon: TicketPercent, soon: true },
        { href: "/admin/offers", label: t("AdminShell.navOffers"), icon: Gift, soon: true },
      ],
    },
    {
      label: "النظام",
      items: [
        { href: "/admin/cms", label: "الإعدادات", icon: Settings },
        { href: "/admin/audit", label: "سجل التدقيق", icon: History },
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
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const groups = useMemo(() => makeAdminNavGroups(t), [t]);
  const flatNav = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const crumbs = useMemo(() => breadcrumbTrail(pathname, flatNav), [pathname, flatNav]);
  const storeLocale = i18n.language.startsWith("ar") ? "/ar" : "/";

  const logout = useCallback(async () => {
    await fetch(freezoneApiUrl("/api/admin/logout"), { method: "POST", credentials: "include" });
    navigate("/admin/login", { replace: true });
  }, [navigate]);

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
            {groups.map((group) => (
              <div key={group.label} className={s.navGroup}>
                <div className={s.navGroupLabel}>{group.label}</div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const hrefBase = item.href.split("?")[0] ?? item.href;
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
                      title={collapsed ? item.label : undefined}
                    >
                      <span className={s.navIcon} aria-hidden>
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <span className={s.navLabel}>{item.label}</span>
                      {item.soon ? <Badge tone="warning">قريبًا</Badge> : null}
                    </NavLink>
                  );
                })}
              </div>
            ))}
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
              <button
                type="button"
                className={s.langToggle}
                aria-label="فتح القائمة"
                onClick={() => setMobileOpen((v) => !v)}
              >
                ☰
              </button>
              <button
                type="button"
                className={s.langToggle}
                aria-label="طي القائمة"
                onClick={() => setCollapsed((c) => !c)}
              >
                {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <nav aria-label="مسار التنقل">
                <ol style={{ display: "flex", flexWrap: "wrap", gap: 6, listStyle: "none", margin: 0, padding: 0, fontSize: 12, color: "var(--fz-text-muted)" }}>
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
                aria-label="بحث في لوحة التحكم"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
                  if (!q) return;
                  const hit = flatNav.find(
                    (item) =>
                      item.label.toLowerCase().includes(q) ||
                      item.href.replace("/admin", "").includes(q),
                  );
                  if (hit) navigate(hit.href);
                }}
              />
            </div>

            <div className={s.topbarRight}>
              <button
                type="button"
                className={s.langToggle}
                title="تحديث الصفحة"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={16} />
              </button>
              <button
                type="button"
                className={s.langToggle}
                onClick={() => void i18n.changeLanguage(i18n.language.startsWith("ar") ? "en" : "ar")}
                title="تبديل اللغة"
              >
                <Languages size={16} />
                {i18n.language.startsWith("ar") ? "EN" : "ع"}
              </button>
              <Link className={s.langToggle} to={storeLocale} target="_blank" rel="noopener noreferrer" title="عرض المتجر">
                <Store size={16} />
              </Link>
              <Link className={s.langToggle} to="/admin/categories" title="إضافة منتج">
                <Plus size={16} />
              </Link>
              <button type="button" className={`${s.langToggle} ${s.userMenuItemDanger}`} onClick={() => void logout()} title="خروج">
                <LogOut size={16} />
              </button>
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
