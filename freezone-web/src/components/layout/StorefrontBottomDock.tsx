"use client";

import { Home, LayoutGrid, Flame, ShoppingCart, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Link, usePathname } from "@/navigation";
import { useTranslations } from "@/i18n/hooks";
import styles from "./StorefrontBottomDock.module.css";

function openMobileCategories() {
  window.dispatchEvent(new CustomEvent("fz:open-mobile-menu"));
}

export function StorefrontBottomDock() {
  const t = useTranslations("BottomDock");
  const path = usePathname();
  const { search } = useLocation();
  const featured = new URLSearchParams(search).get("featured") === "true";

  const homeActive = path === "/" || path === "";
  const dealsActive = path === "/products" && featured;
  const cartActive = path === "/cart";
  const accountActive = path === "/account" || path === "/login" || path === "/register";

  return (
    <nav className={styles.root} aria-label={t("ariaLabel")}>
      <div className={styles.inner}>
        <Link to="/" className={`${styles.item} ${homeActive ? styles.itemActive : ""}`}>
          <span className={styles.iconWrap}>
            <Home size={22} strokeWidth={2} aria-hidden />
          </span>
          <span className={styles.label}>{t("home")}</span>
        </Link>

        <button type="button" className={styles.item} onClick={openMobileCategories}>
          <span className={styles.iconWrap}>
            <LayoutGrid size={22} strokeWidth={2} aria-hidden />
          </span>
          <span className={styles.label}>{t("categories")}</span>
        </button>

        <Link
          to="/products?featured=true"
          className={`${styles.item} ${dealsActive ? styles.itemActive : ""}`}
        >
          <span className={styles.iconWrap}>
            <Flame size={22} strokeWidth={2} aria-hidden />
          </span>
          <span className={styles.label}>{t("deals")}</span>
        </Link>

        <Link to="/cart" className={`${styles.item} ${cartActive ? styles.itemActive : ""}`}>
          <span className={styles.iconWrap}>
            <ShoppingCart size={22} strokeWidth={2} aria-hidden />
          </span>
          <span className={styles.label}>{t("cart")}</span>
        </Link>

        <Link to="/account" className={`${styles.item} ${accountActive ? styles.itemActive : ""}`}>
          <span className={styles.iconWrap}>
            <User size={22} strokeWidth={2} aria-hidden />
          </span>
          <span className={styles.label}>{t("account")}</span>
        </Link>
      </div>
    </nav>
  );
}
