"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  ExternalLink,
  LogOut,
  Store,
  History,
  PanelLeftClose,
  PanelLeft,
  Search,
  Bell,
  HelpCircle,
  Plus,
} from "lucide-react";
import styles from "./AdminChrome.module.css";

type NavItem = { href: string; label: string; icon: LucideIcon };

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "الواجهة والمحتوى",
    items: [
      { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
      { href: "/admin/cms", label: "إعدادات الموقع (CMS)", icon: LayoutPanelTop },
      { href: "/admin/content", label: "بناء الصفحة الرئيسية", icon: LayoutGrid },
      { href: "/admin/media", label: "مكتبة الوسائط", icon: Images },
      { href: "/admin/design", label: "المظهر والألوان", icon: Palette },
    ],
  },
  {
    label: "المتجر والكتالوج",
    items: [
      { href: "/admin/products", label: "المنتجات", icon: Package },
      { href: "/admin/categories", label: "التصنيفات", icon: FolderTree },
      { href: "/admin/brands", label: "العلامات التجارية", icon: Tag },
    ],
  },
  {
    label: "المبيعات والتسويق",
    items: [
      { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart },
      { href: "/admin/coupons", label: "الكوبونات", icon: TicketPercent },
    ],
  },
  {
    label: "النظام",
    items: [{ href: "/admin/audit", label: "سجل التدقيق", icon: History }],
  },
];

const FLAT_NAV: NavItem[] = GROUPS.flatMap((g) => g.items);

const SIDEBAR_KEY = "admin-sidebar-collapsed";

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return { collapsed, toggle };
}

function breadcrumbTrail(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/admin";
  const home = { href: "/admin", label: "لوحة التحكم" };
  if (normalized === "/admin") {
    return [home];
  }
  const match = FLAT_NAV.filter(
    (item) => item.href !== "/admin" && (normalized === item.href || normalized.startsWith(`${item.href}/`)),
  ).sort((a, b) => b.href.length - a.href.length)[0];

  const trail: { href: string; label: string }[] = [home];
  if (match) {
    trail.push({ href: match.href, label: match.label });
  }
  if (match && normalized !== match.href) {
    if (normalized.includes("/edit/")) {
      trail.push({ href: normalized, label: "تعديل منتج" });
    } else {
      trail.push({ href: normalized, label: "تفاصيل" });
    }
  }
  if (!match) {
    trail.push({ href: normalized, label: "صفحة" });
  }
  return trail;
}

function AdminTopBar({ collapsed, onToggleSidebar }: { collapsed: boolean; onToggleSidebar: () => void }) {
  const navigate = useNavigate();
  const pathname = useLocation().pathname ?? "";
  const crumbs = useMemo(() => breadcrumbTrail(pathname), [pathname]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    navigate("/admin/login", { replace: true });
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <nav aria-label="مسار التنقل">
          <ol className={styles.breadcrumbs}>
            {crumbs.map((c, i) => (
              <li key={`${c.href}-${i}`}>
                {i > 0 && <span className={styles.breadcrumbSep}>/</span>}
                {i < crumbs.length - 1 ? (
                  <Link className={styles.breadcrumbLink} to={c.href}>
                    {c.label}
                  </Link>
                ) : (
                  <span className={styles.breadcrumbCurrent}>{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className={styles.topbarCenter}>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} size={16} aria-hidden />
          <input
            className={styles.searchInput}
            type="search"
            placeholder="بحث سريع في الأقسام…"
            aria-label="بحث في لوحة التحكم"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
              if (!q) return;
              const hit = FLAT_NAV.find(
                (item) =>
                  item.label.includes(q) || item.href.replace("/admin", "").includes(q) || item.href.includes(q),
              );
              if (hit) navigate(hit.href);
            }}
          />
        </div>
      </div>

      <div className={styles.topbarRight}>
        <button type="button" className={styles.iconBtn} aria-label="طي أو توسيع القائمة" onClick={onToggleSidebar}>
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
        <button type="button" className={styles.iconBtn} title="التنبيهات" aria-label="التنبيهات">
          <Bell size={20} />
        </button>
        <button type="button" className={styles.iconBtn} title="مساعدة" aria-label="مساعدة">
          <HelpCircle size={20} />
        </button>
        <span className={styles.topbarDivider} aria-hidden />
        <div className={styles.topbarActions}>
          <Link className={styles.btnGhost} to="/en" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} aria-hidden />
            معاينة الموقع
          </Link>
          <Link className={styles.btnGhost} to="/ar" target="_blank" rel="noopener noreferrer">
            النسخة العربية
          </Link>
          <Link className={styles.btnPrimarySm} to="/admin/products">
            <Plus size={16} aria-hidden />
            إضافة منتج
          </Link>
          <button type="button" className={styles.btnDanger} onClick={() => void logout()}>
            <LogOut size={16} aria-hidden />
            خروج
          </button>
        </div>
      </div>
    </header>
  );
}

export function AdminAppShell() {
  const pathname = useLocation().pathname ?? "";
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <div className={`admin-root ${styles.root}`}>
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Store size={18} aria-hidden />
          </div>
          <div className={styles.brandText}>
            <p className={styles.brandTitle}>لوحة الإدارة</p>
            <p className={styles.brandSub}>المتجر والواجهة</p>
          </div>
        </div>

        {GROUPS.map((group) => (
          <div key={group.label} className={styles.navSection}>
            <div className={styles.navSectionLabel}>{group.label}</div>
            {group.items.map((item) => {
              const on = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`${styles.navLink} ${on ? styles.navLinkActive : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={styles.navIcon} size={18} strokeWidth={on ? 2.25 : 2} />
                  <span className={styles.navLinkText}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        <div className={styles.spacer} />

        <div className={styles.footerLinks}>
          <Link to="/en" className={styles.footerLink}>
            ← الموقع للزوار
          </Link>
        </div>
      </aside>

      <div className={styles.main}>
        <AdminTopBar collapsed={collapsed} onToggleSidebar={toggle} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
