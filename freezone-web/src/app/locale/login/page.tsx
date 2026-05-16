"use client";

import styles from "./auth.module.css";
import { Link } from "@/navigation";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { Phone, Shield, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "@/i18n/hooks";
import { useStorefrontUser } from "@/lib/storefront-user";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const navigate = useNavigate();
  const setLoggedIn = useStorefrontUser((s) => s.setLoggedIn);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoggedIn(true);
    navigate(`/${locale}/account`, { replace: true });
  };

  return (
    <div className={styles.wrapper}>
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className={styles.card}
      >
        <div className={styles.cardTop}>
          <SiteLogo variant="auth" />
          <p className={styles.subtitle}>{t("loginWelcome")}</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t("phoneLabel")}</label>
            <div className={styles.inputWrapper}>
              <Phone className={styles.inputIcon} />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                className={styles.input}
                placeholder={t("phonePlaceholder")}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t("otpLabel")}</label>
            <div className={styles.inputWrapper}>
              <Shield className={styles.inputIcon} />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={8}
                className={styles.input}
                placeholder={t("otpPlaceholder")}
              />
            </div>
            <p className={styles.hint}>{t("otpHint")}</p>
          </div>

          <button type="submit" className={`btn-primary ${styles.submitBtn}`}>
            <LogIn size={20} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
            {t("signIn")}
          </button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account? <Link href="/register">Sign up</Link>
        </p>
      </motion.div>
    </div>
  );
}
