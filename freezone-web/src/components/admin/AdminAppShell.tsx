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
  Menu,
  Search,
  Plus,
  FileWarning,
  Filter,
  Settings,
  Languages,
} from "lucide-react";
import { freezoneApiUrl } from "@/lib/api-internal";
import styles from "./AdminChrome.module.css";

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
      ],
    },
    {
      label: "الموقع والمحتوى",
      items: [
        { href: "/admin/content", label: "بناء الصفحة الرئيسية", icon: LayoutGrid },
        { href: "/admin/cms", label: "إعدادات الموقع", icon: LayoutPanelTop },
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
    if (normalized.includes("/categories/") && !normalized.includes("/attributes")) {
      trail.push({ href: normalized.split("?")[0] ?? normalized, label: "إدارة القسم" });
    } else if (normalized.includes("/edit/")) {
      trail.push({ href: normalized, label: "تعديل منتج" });
    } else if (normalized.includes("/new")) {
      trail.push({ href: normalized, label: "منتج جديد" });
    } else if (normalized.includes("/attributes")) {
      trail.push({ href: normalized, label: "سمات القسم" });
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
  onOpenMobileNav,
  flatNav,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
  flatNav: NavItem[];
}) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const pathname = useLocation().pathname ?? "";
  const crumbs = useMemo(() => breadcrumbTrail(pathname, flatNav), [pathname, flatNav]);

  async function logout() {
    await fetch(freezoneApiUrl("/api/admin/logout"), { method: "POST", credentials: "include" });
    navigate("/admin/login", { replace: true });
  }

  const storeLocale = i18n.language.startsWith("ar") ? "/ar" : "/";

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <button type="button" className={styles.mobileMenuBtn} aria-label="فتح القائمة" onClick={onOpenMobileNav}>
          <Menu size={20} />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="طي أو توسيع القائمة"
          onClick={onToggleSidebar}
        >
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
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
            placeholder="بحث في القائمة…"
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
        <div className={styles.topbarActions}>
          <Link className={styles.btnGhost} to={storeLocale} target="_blank" rel="noopener noreferrer">
            <Store size={16} aria-hidden />
            عرض المتجر
          </Link>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => void i18n.changeLanguage(i18n.language.startsWith("ar") ? "en" : "ar")}
            title="تبديل اللغة"
          >
            <Languages size={16} aria-hidden />
            {i18n.language.startsWith("ar") ? "English" : "العربية"}
          </button>
          <Link className={styles.btnPrimarySm} to="/admin/categories">
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const groups = useMemo(() => makeAdminNavGroups(t), [t]);
  const flatNav = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  return (
    <div className={`admin-root ${styles.root}`}>
      {mobileNavOpen ? (
        <button
          type="button"
          className={styles.sidebarBackdrop}
          aria-label="إغلاق القائمة"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""} ${mobileNavOpen ? styles.sidebarMobileOpen : ""}`}
      >
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Store size={18} aria-hidden />
          </div>
          <div className={styles.brandText}>
            <p className={styles.brandTitle}>FreeZone</p>
            <p className={styles.brandSub}>لوحة الإدارة</p>
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.label} className={styles.navSection}>
            <div className={styles.navSectionLabel}>{group.label}</div>
            {group.items.map((item) => {
              const on = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={`${group.label}-${item.href}-${item.label}`}
                  to={item.href}
                  className={`${styles.navLink} ${on ? styles.navLinkActive : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={styles.navIcon} size={18} strokeWidth={on ? 2.25 : 2} />
                  <span className={styles.navLinkText}>{item.label}</span>
                  {item.soon && !collapsed ? <span className={styles.navSoon}>قريبًا</span> : null}
                </Link>
              );
            })}
          </div>
        ))}

        <div className={styles.spacer} />

        <div className={styles.footerLinks}>
          <Link to={i18n.language.startsWith("ar") ? "/ar" : "/"} className={styles.footerLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} aria-hidden />
            عرض المتجر
          </Link>
        </div>
      </aside>

      <div className={styles.main}>
        <AdminTopBar
          collapsed={collapsed}
          onToggleSidebar={toggle}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          flatNav={flatNav}
        />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
