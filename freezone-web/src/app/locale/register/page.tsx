"use client";

import styles from "../login/auth.module.css";
import { Link } from "@/navigation";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { Phone, Shield, UserPlus, User } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useTranslations } from "@/i18n/hooks";

export default function RegisterPage() {
  const t = useTranslations("Auth");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast(t("loginPending"));
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
          <p className={styles.subtitle}>{t("registerWelcome")}</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t("fullNameLabel")}</label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} />
              <input type="text" required className={styles.input} placeholder="Ahmed Ali" autoComplete="name" />
            </div>
          </div>

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
            <UserPlus size={20} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
            {t("createAccount")}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
