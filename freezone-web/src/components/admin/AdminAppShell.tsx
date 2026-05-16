"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  Bell,
  HelpCircle,
  Plus,
} from "lucide-react";
import { freezoneApiUrl } from "@/lib/api-internal";
import styles from "./AdminChrome.module.css";

type NavItem = { href: string; label: string; icon: LucideIcon };

function makeAdminNavGroups(t: TFunction): { label: string; items: NavItem[] }[] {
  return [
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
        { href: "/admin/categories", label: "الأقسام", icon: FolderTree },
        { href: "/admin/brands", label: "العلامات التجارية", icon: Tag },
      ],
    },
    {
      label: "المبيعات والتسويق",
      items: [
        { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart },
        { href: "/admin/coupons", label: "الكوبونات", icon: TicketPercent },
        { href: "/admin/offers", label: t("AdminShell.navOffers"), icon: Gift },
      ],
    },
    {
      label: "النظام",
      items: [{ href: "/admin/audit", label: "سجل التدقيق", icon: History }],
    },
  ];
}

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

function breadcrumbTrail(pathname: string, flatNav: NavItem[]) {
  const normalized = pathname.replace(/\/+$/, "") || "/admin";
  const home = { href: "/admin", label: "لوحة التحكم" };
  if (normalized === "/admin") {
    return [home];
  }
  const match = flatNav
    .filter((item) => item.href !== "/admin" && (normalized === item.href || normalized.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];

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

function AdminTopBar({
  collapsed,
  onToggleSidebar,
  flatNav,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  flatNav: NavItem[];
}) {
  const navigate = useNavigate();
  const pathname = useLocation().pathname ?? "";
  const crumbs = useMemo(() => breadcrumbTrail(pathname, flatNav), [pathname, flatNav]);

  async function logout() {
    await fetch(freezoneApiUrl("/api/admin/logout"), { method: "POST", credentials: "include" });
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
            placeholder="بحث سريع في القائمة…"
            aria-label="بحث في لوحة التحكم"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
              if (!q) return;
              const hit = flatNav.find(
                (item) =>
                  item.label.toLowerCase().includes(q) ||
                  item.href.replace("/admin", "").includes(q) ||
                  item.href.includes(q),
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
  const { t, i18n } = useTranslation();
  const pathname = useLocation().pathname ?? "";
  const { collapsed, toggle } = useSidebarCollapsed();

  const groups = useMemo(() => makeAdminNavGroups(t), [t, i18n.language]);
  const flatNav = useMemo(() => groups.flatMap((g) => g.items), [groups]);

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

        {groups.map((group) => (
          <div key={group.label} className={styles.navSection}>
            <div className={styles.navSectionLabel}>{group.label}</div>
            {group.items.map((item) => {
              const on = isNavActive(pathname, item.href);
              const Icon = item.icon;
              const title = collapsed
                ? item.label
                : item.href === "/admin/offers"
                  ? i18n.language.startsWith("ar")
                    ? "Offers"
                    : "العروض"
                  : undefined;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`${styles.navLink} ${on ? styles.navLinkActive : ""}`}
                  title={title}
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
        <AdminTopBar collapsed={collapsed} onToggleSidebar={toggle} flatNav={flatNav} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
