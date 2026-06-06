"use client";

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { GitCompare, Heart, LogOut, PackageSearch, ShoppingCart } from "lucide-react";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { useStorefrontUser } from "@/lib/storefront-user";
import { readRememberedOrders, type RememberedOrder } from "@/lib/order-tracking";
import { Seo } from "@/components/seo/Seo";
import styles from "./account.module.css";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

function formatDate(iso: string, locale: "en" | "ar") {
  try {
    return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-IQ" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AccountPage() {
  const locale = useLocale();
  const t = useTranslations("Account");
  const tTrack = useTranslations("TrackOrder");
  const tSeo = useTranslations("Seo");
  const { isLoggedIn, logout } = useStorefrontUser();
  const [orders, setOrders] = useState<RememberedOrder[]>([]);

  useEffect(() => {
    setOrders(readRememberedOrders());
  }, []);

  if (!isLoggedIn) {
    return <Navigate to={`/${locale}/login`} replace />;
  }

  return (
    <div className={styles.wrapper}>
      <Seo title={tSeo("accountTitle")} noindex />

      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={`fz-type-h1 ${styles.title}`}>{t("title")}</h1>
          <p className={`fz-type-small ${styles.note}`}>{t("signedInNote")}</p>
        </div>
        <button type="button" className={styles.signOutBtn} onClick={() => logout()}>
          <LogOut size={16} aria-hidden />
          {t("signOut")}
        </button>
      </header>

      <section className={styles.card} aria-label={t("quickTitle")}>
        <h2 className={`fz-type-h3 ${styles.cardTitle}`}>{t("quickTitle")}</h2>
        <div className={styles.quickGrid}>
          <Link href="/wishlist" className={styles.quickLink}>
            <Heart size={20} aria-hidden />
            {t("linkWishlist")}
          </Link>
          <Link href="/compare" className={styles.quickLink}>
            <GitCompare size={20} aria-hidden />
            {t("linkCompare")}
          </Link>
          <Link href="/track-order" className={styles.quickLink}>
            <PackageSearch size={20} aria-hidden />
            {t("linkTrack")}
          </Link>
          <Link href="/cart" className={styles.quickLink}>
            <ShoppingCart size={20} aria-hidden />
            {t("linkCart")}
          </Link>
        </div>
      </section>

      <section className={styles.card} aria-label={t("ordersTitle")}>
        <h2 className={`fz-type-h3 ${styles.cardTitle}`}>{t("ordersTitle")}</h2>
        {orders.length === 0 ? (
          <>
            <p className={styles.empty}>{t("ordersEmpty")}</p>
            <div className={styles.emptyActions}>
              <Link href="/products" className="btn-primary">
                {t("shopNow")}
              </Link>
            </div>
          </>
        ) : (
          <ul className={styles.ordersList}>
            {orders.map((o) => (
              <li key={o.orderNumber} className={styles.orderRow}>
                <div className={styles.orderMeta}>
                  <span className={styles.orderNumber}>{t("orderLabel", { orderNumber: o.orderNumber })}</span>
                  <span className={styles.orderSub}>
                    {formatDate(o.createdAt, locale)}
                    {o.status ? ` · ${tTrack(`status_${o.status}`, { defaultValue: o.status })}` : ""}
                  </span>
                </div>
                {o.total > 0 ? <span className={styles.orderTotal}>{formatMoney(o.total)} IQD</span> : null}
                <Link
                  href={`/track-order?order=${encodeURIComponent(o.orderNumber)}&phone=${encodeURIComponent(o.phone)}`}
                  className={styles.trackLink}
                >
                  {t("trackBtn")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
