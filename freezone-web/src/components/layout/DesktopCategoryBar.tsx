"use client";

/**
 * Desktop category bar + hover/focus mega-menus (>=1024px only).
 *
 * Closes the #1 structural gap vs the benchmark: on desktop, categories were
 * only reachable via the hamburger drawer or the footer. This renders the SAME
 * `navItems` already passed to <MobileMenu> as a persistent top-level category
 * bar with mega-menu panels. It is mounted inside the NavBar's `navRef` wrapper
 * so the existing ResizeObserver keeps `--fz-storefront-sticky-offset` correct.
 *
 * Dropdowns use pure CSS :hover / :focus-within (keyboard-accessible, no JS
 * state), and logical properties so RTL (Arabic-default) mirrors correctly.
 */
import { Link } from "@/navigation";
import { ChevronDown } from "lucide-react";
import type { NavItemResolved } from "@/lib/nav-types";
import styles from "./DesktopCategoryBar.module.css";

export function DesktopCategoryBar({
  items,
  locale,
}: {
  items: NavItemResolved[];
  locale: "en" | "ar";
}) {
  if (!items || items.length === 0) return null;
  const ar = locale === "ar";

  return (
    <nav className={styles.bar} aria-label={ar ? "تصفّح حسب القسم" : "Shop by category"}>
      <div className={`container ${styles.inner}`}>
        <Link href="/products" className={styles.allLink}>
          {ar ? "كل الأقسام" : "All Categories"}
        </Link>
        <ul className={styles.list}>
          {items.map((item) => {
            const Icon = item.icon;
            const hasPanel = item.columns && item.columns.length > 0;
            return (
              <li key={item.id} className={styles.item}>
                <Link href={item.href} className={styles.topLink}>
                  {Icon ? <Icon size={16} className={styles.topIcon} aria-hidden /> : null}
                  <span>{item.label}</span>
                  {hasPanel ? <ChevronDown size={14} className={styles.caret} aria-hidden /> : null}
                </Link>
                {hasPanel ? (
                  <div className={styles.panel} role="menu" aria-label={item.label}>
                    <div className={styles.panelGrid}>
                      {item.columns.map((col, ci) => (
                        <div
                          key={ci}
                          className={`${styles.col} ${col.highlight ? styles.colHighlight : ""}`}
                        >
                          <div className={styles.colTitle}>{col.title}</div>
                          <ul className={styles.colList}>
                            {col.items.map((row, ri) => (
                              <li key={ri}>
                                <Link href={row.href} className={styles.colLink} role="menuitem">
                                  {row.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
