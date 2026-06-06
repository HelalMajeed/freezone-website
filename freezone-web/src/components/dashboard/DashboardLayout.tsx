import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FREEZONE_Z_LOGO } from "@/lib/brand-assets";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import type { LegacyRoleAlias } from "@/lib/dashboard/api";
import { Avatar, Badge } from "@/components/dashboard/ui";
import s from "./layout.module.css";

type NavGroupDef = {
  label: { en: string; ar: string };
  items: NavItemDef[];
  minRole?: LegacyRoleAlias;
};

type NavItemDef = {
  to: string;
  label: { en: string; ar: string };
  icon: string;
  end?: boolean;
  minRole?: LegacyRoleAlias;
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
      { to: "/dashboard/data-quality", label: { en: "Data quality", ar: "جودة البيانات" }, icon: "◆" },
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

/** Path → label index for breadcrumbs (NAV plus routes not in the sidebar). */
const CRUMB_LABELS: Record<string, { en: string; ar: string }> = Object.fromEntries(
  NAV.flatMap((g) => g.items.map((it) => [it.to, it.label])),
);
CRUMB_LABELS["/dashboard/profile"] = { en: "Profile & password", ar: "حسابي وكلمة السر" };

const SIDEBAR_PREF_KEY = "fz-dashboard-sidebar-collapsed";

function readSidebarPref(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

const MOBILE_QUERY = "(max-width: 900px)";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DashboardLayout() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useDashboardAuth((s) => s.user);
  const logout = useDashboardAuth((s) => s.logout);
  const hasRole = useDashboardAuth((s) => s.hasRole);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readSidebarPref);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

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

  // Track the mobile breakpoint so the drawer / collapse modes never overlap.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Mobile drawer: focus trap + Escape + scroll lock + focus restore.
  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = sidebarRef.current;
    const hamburger = hamburgerRef.current;
    if (!sidebar) return;

    const focusables = () => Array.from(sidebar.querySelectorAll<HTMLElement>(FOCUSABLE));
    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !sidebar.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !sidebar.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      hamburger?.focus();
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const onToggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_PREF_KEY, next ? "1" : "0");
      } catch {
        /* private mode — preference simply not persisted */
      }
      return next;
    });
  }, []);

  const onLogout = async () => {
    await logout();
    navigate("/dashboard/login", { replace: true });
  };

  const onToggleLang = () => {
    void i18n.changeLanguage(lang === "ar" ? "en" : "ar");
  };

  // Breadcrumb trail derived from the current path + NAV labels.
  const crumbs = useMemo(() => {
    const items: { to: string; label: string }[] = [
      { to: "/dashboard", label: lang === "ar" ? "اللوحة" : "Dashboard" },
    ];
    const pathname = location.pathname.replace(/\/+$/, "") || "/dashboard";
    if (pathname !== "/dashboard") {
      let acc = "";
      for (const seg of pathname.split("/").filter(Boolean)) {
        acc += `/${seg}`;
        if (acc === "/dashboard") continue;
        const known = CRUMB_LABELS[acc];
        items.push({
          to: acc,
          label: known ? known[lang] : decodeURIComponent(seg).replace(/-/g, " "),
        });
      }
    }
    return items;
  }, [location.pathname, lang]);

  const navAriaLabel = lang === "ar" ? "التنقل الرئيسي" : "Main navigation";

  return (
    <div className="dashboard-root">
      <div className="dashboard-shell" data-collapsed={!isMobile && collapsed ? "true" : "false"}>
        {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          ref={sidebarRef}
          id="dashboard-sidebar"
          className={s.sidebar}
          data-mobile-open={mobileOpen ? "true" : "false"}
          data-collapsed={!isMobile && collapsed ? "true" : "false"}
          aria-hidden={isMobile && !mobileOpen ? true : undefined}
        >
          <div className={s.brand}>
            <span className={s.brandMark}>
              <img src={FREEZONE_Z_LOGO} alt="" className={s.brandMarkImg} />
            </span>
            <div className={s.brandText}>
              <span className={s.brandName}>Freezone</span>
              <span className={s.brandSub}>{lang === "ar" ? "لوحة التحكم" : "Dashboard"}</span>
            </div>
            <button
              type="button"
              className={s.drawerClose}
              onClick={() => setMobileOpen(false)}
              aria-label={lang === "ar" ? "إغلاق القائمة" : "Close menu"}
            >
              ✕
            </button>
          </div>

          <nav aria-label={navAriaLabel}>
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
                      title={!isMobile && collapsed ? item.label[lang] : undefined}
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
            <button
              type="button"
              className={s.collapseBtn}
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              title={
                collapsed
                  ? lang === "ar"
                    ? "توسيع القائمة"
                    : "Expand sidebar"
                  : lang === "ar"
                    ? "طي القائمة"
                    : "Collapse sidebar"
              }
            >
              <span className={s.collapseChevron} aria-hidden data-collapsed={collapsed ? "true" : "false"}>
                ❮
              </span>
              <span className={s.navLabel}>
                {collapsed ? (lang === "ar" ? "توسيع" : "Expand") : lang === "ar" ? "طي القائمة" : "Collapse"}
              </span>
            </button>
            <div className={s.versionNote}>v1.0 · {lang === "ar" ? "بُنيت لأجلك" : "built for you"}</div>
          </div>
        </aside>

        {mobileOpen && (
          <div className={s.mobileBackdrop} onClick={() => setMobileOpen(false)} aria-hidden="true" />
        )}

        {/* ─── Main ────────────────────────────────────────────────────────── */}
        <div className="dashboard-main">
          <header className={s.topbar}>
            <div className={s.topbarLeft}>
              <button
                ref={hamburgerRef}
                type="button"
                className={s.menuBtn}
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={lang === "ar" ? "فتح القائمة" : "Open menu"}
                aria-expanded={mobileOpen}
                aria-controls="dashboard-sidebar"
              >
                ☰
              </button>

              <nav className={s.breadcrumbs} aria-label={lang === "ar" ? "مسار التنقل" : "Breadcrumb"}>
                <ol className={s.crumbList}>
                  {crumbs.map((crumb, i) => {
                    const isLast = i === crumbs.length - 1;
                    return (
                      <li key={crumb.to} className={s.crumb}>
                        {i > 0 && (
                          <span className={s.crumbSep} aria-hidden>
                            ›
                          </span>
                        )}
                        {isLast ? (
                          <span className={s.crumbCurrent} aria-current="page">
                            {crumb.label}
                          </span>
                        ) : (
                          <NavLink to={crumb.to} end className={s.crumbLink}>
                            {crumb.label}
                          </NavLink>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>

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
                  <Avatar name={user?.name ?? "FreeZone"} url={user?.avatarUrl ?? FREEZONE_Z_LOGO} />
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
