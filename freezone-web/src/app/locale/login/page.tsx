"use client";

import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import styles from "./auth.module.css";
import { Link } from "@/navigation";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { AlertCircle, Loader2, Lock, LogIn, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "@/i18n/hooks";
import { useStorefrontUser } from "@/lib/storefront-user";
import { isValidIraqiPhone } from "@/lib/phone";
import { Seo } from "@/components/seo/Seo";
import { authErrorMessageKey } from "./auth-error";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const tSeo = useTranslations("Seo");
  const locale = useLocale();
  const navigate = useNavigate();
  const status = useStorefrontUser((s) => s.status);
  const hydrate = useStorefrontUser((s) => s.hydrate);
  const login = useStorefrontUser((s) => s.login);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
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
    if (!isValidIraqiPhone(phone)) {
      setErrorKey("errInvalidPhone");
      return;
    }
    if (!password) {
      setErrorKey("errInvalidCredentials");
      return;
    }
    setErrorKey(null);
    setBusy(true);
    try {
      await login(phone, password);
      navigate(`/${locale}/account`, { replace: true });
    } catch (err) {
      setErrorKey(authErrorMessageKey(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <Seo title={tSeo("loginTitle")} noindex />
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

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {errorKey ? (
            <p className={styles.errorBox} role="alert">
              <AlertCircle size={16} aria-hidden />
              {t(errorKey)}
            </p>
          ) : null}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="login-phone">
              {t("phoneLabel")}
            </label>
            <div className={styles.inputWrapper}>
              <Phone className={styles.inputIcon} />
              <input
                id="login-phone"
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
            <label className={styles.label} htmlFor="login-password">
              {t("passwordLabel")}
            </label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} />
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                className={styles.input}
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={busy}>
            {busy ? (
              <Loader2 size={20} className={styles.btnIcon} aria-hidden />
            ) : (
              <LogIn size={20} className={styles.btnIcon} aria-hidden />
            )}
            {busy ? t("signingIn") : t("signIn")}
          </button>
        </form>

        <p className={styles.footer}>
          {t("noAccount")} <Link href="/register">{t("signUpLink")}</Link>
        </p>
      </motion.div>
    </div>
  );
}
