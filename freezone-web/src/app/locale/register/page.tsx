"use client";

import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import styles from "../login/auth.module.css";
import { Link } from "@/navigation";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { AlertCircle, Loader2, Lock, Phone, User, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "@/i18n/hooks";
import { useStorefrontUser } from "@/lib/storefront-user";
import { isValidIraqiPhone } from "@/lib/phone";
import { Seo } from "@/components/seo/Seo";
import { authErrorMessageKey } from "../login/auth-error";

export default function RegisterPage() {
  const t = useTranslations("Auth");
  const tSeo = useTranslations("Seo");
  const locale = useLocale();
  const navigate = useNavigate();
  const status = useStorefrontUser((s) => s.status);
  const hydrate = useStorefrontUser((s) => s.hydrate);
  const register = useStorefrontUser((s) => s.register);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (status === "authenticated") {
    return <Navigate to={`/${locale}/account`} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) {
      setErrorKey("errNameRequired");
      return;
    }
    if (!isValidIraqiPhone(phone)) {
      setErrorKey("errInvalidPhone");
      return;
    }
    if (password.length < 8) {
      setErrorKey("errWeakPassword");
      return;
    }
    if (password !== confirm) {
      setErrorKey("errPasswordMismatch");
      return;
    }
    setErrorKey(null);
    setBusy(true);
    try {
      await register({ name: name.trim(), phone, password });
      navigate(`/${locale}/account`, { replace: true });
    } catch (err) {
      setErrorKey(authErrorMessageKey(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <Seo title={tSeo("registerTitle")} noindex />
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

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {errorKey ? (
            <p className={styles.errorBox} role="alert">
              <AlertCircle size={16} aria-hidden />
              {t(errorKey)}
            </p>
          ) : null}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="register-name">
              {t("fullNameLabel")}
            </label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} />
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                required
                className={styles.input}
                placeholder={t("fullNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="register-phone">
              {t("phoneLabel")}
            </label>
            <div className={styles.inputWrapper}>
              <Phone className={styles.inputIcon} />
              <input
                id="register-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                required
                className={styles.input}
                placeholder={t("phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="register-password">
              {t("passwordLabel")}
            </label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} />
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className={styles.input}
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <p className={styles.hint}>{t("passwordHint")}</p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="register-confirm">
              {t("confirmPasswordLabel")}
            </label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} />
              <input
                id="register-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className={styles.input}
                placeholder={t("passwordPlaceholder")}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={busy}>
            {busy ? (
              <Loader2 size={20} className={styles.btnIcon} aria-hidden />
            ) : (
              <UserPlus size={20} className={styles.btnIcon} aria-hidden />
            )}
            {busy ? t("creatingAccount") : t("createAccount")}
          </button>
        </form>

        <p className={styles.footer}>
          {t("haveAccount")} <Link href="/login">{t("signInLink")}</Link>
        </p>
      </motion.div>
    </div>
  );
}
