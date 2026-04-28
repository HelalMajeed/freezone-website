"use client";

import { Navigate } from "react-router-dom";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { useStorefrontUser } from "@/lib/storefront-user";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { LogOut } from "lucide-react";
import styles from "../login/auth.module.css";

export default function AccountPage() {
  const locale = useLocale();
  const t = useTranslations("Account");
  const { isLoggedIn, logout } = useStorefrontUser();

  if (!isLoggedIn) {
    return <Navigate to={`/${locale}/login`} replace />;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card} style={{ maxWidth: 480 }}>
        <div className={styles.cardTop}>
          <SiteLogo variant="auth" />
          <h1 className={styles.subtitle} style={{ fontSize: "1.35rem", fontWeight: 800, marginTop: 8 }}>
            {t("title")}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem", marginTop: 8 }}>{t("subtitle")}</p>
        </div>
        <button
          type="button"
          className={`btn-red ${styles.submitBtn}`}
          onClick={() => logout()}
        >
          <LogOut size={18} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
          {t("signOut")}
        </button>
        <p className={styles.footer}>
          <Link href="/">{t("backHome")}</Link>
        </p>
      </div>
    </div>
  );
}
