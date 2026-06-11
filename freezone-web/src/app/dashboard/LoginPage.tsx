import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { DashboardApiError } from "@/lib/dashboard/api";
import { DASHBOARD_ERROR_MESSAGES, useDashboardLocale } from "@/lib/dashboard/i18n";
import { Button, Field, Input } from "@/components/dashboard/ui";
import { FREEZONE_Z_LOGO } from "@/lib/brand-assets";
import s from "./login.module.css";

/**
 * Dashboard login.
 *
 * On mount the page attempts passwordless direct entry ONCE — a local/staging
 * convenience the API enables via ADMIN_DIRECT_LOGIN outside production. When
 * the server refuses (production always does: direct login fails closed
 * there), it renders the credentialed form: email OR Iraqi phone
 * (07XXXXXXXXX) + password against POST /api/dashboard/auth/login.
 */

export function DashboardLoginPage() {
  const { lang, dir, t, pick, formatError } = useDashboardLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/admin";

  const status = useDashboardAuth((sel) => sel.status);
  const refresh = useDashboardAuth((sel) => sel.refresh);
  const directLogin = useDashboardAuth((sel) => sel.directLogin);
  const login = useDashboardAuth((sel) => sel.login);

  /** "auto" = trying direct entry; "form" = credential form. */
  const [phase, setPhase] = useState<"auto" | "form">("auto");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  useEffect(() => {
    if (status === "idle") {
      void refresh();
      return;
    }
    if (status === "loading") return;
    if (status === "authenticated") {
      navigate(next, { replace: true });
      return;
    }
    // Unauthenticated → attempt direct entry once, then fall back to the form.
    if (!tried.current) {
      tried.current = true;
      directLogin()
        .then(() => navigate(next, { replace: true }))
        .catch(() => setPhase("form"));
    }
  }, [status, refresh, navigate, next, directLogin]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const id = identifier.trim();
    if (!id || !password) {
      setError(t("login.missingFields"));
      return;
    }
    setSubmitting(true);
    setError(null);
    login(id, password)
      .then(() => navigate(next, { replace: true }))
      .catch((err) => {
        // The global rate limiter answers 429 with a non-catalog code string.
        if (
          err instanceof DashboardApiError &&
          err.status === 429 &&
          !(err.code in DASHBOARD_ERROR_MESSAGES)
        ) {
          setError(DASHBOARD_ERROR_MESSAGES.RATE_LIMITED[lang]);
        } else {
          setError(formatError(err));
        }
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className={s.wrap} dir={dir}>
      <aside className={s.brandPanel}>
        <div className={s.brandTop}>
          <span className={s.brandTopMark}>
            <img src={FREEZONE_Z_LOGO} alt="" width={48} height={48} style={{ display: "block" }} />
          </span>
          <div>
            <div className={s.brandTopName}>Freezone</div>
            <div className={s.brandTopSub}>{pick({ en: "Control Center", ar: "لوحة التحكم" })}</div>
          </div>
        </div>
        <div className={s.brandHero}>
          <h1 className={s.brandHeroTitle}>
            {pick({
              en: "Manage your entire storefront from one place.",
              ar: "إدارة موقعك من مكان واحد.",
            })}
          </h1>
        </div>
        <div className={s.brandFooter}>
          <span>© Freezone</span>
          <span>•</span>
          <span>{pick({ en: "Secure & fast", ar: "آمن وسريع" })}</span>
        </div>
      </aside>

      <section className={s.formPanel}>
        <div className={s.form}>
          {phase === "auto" ? (
            <>
              <h2 className={s.formTitle}>{t("login.opening")}</h2>
              <p className={s.formSubtitle}>{t("login.openingHint")}</p>
              <div className="dashboard-loader" aria-label={t("common.loading")} style={{ marginTop: 16 }} />
            </>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <h2 className={s.formTitle}>{t("login.title")}</h2>
              <p className={s.formSubtitle}>{t("login.subtitle")}</p>
              {error && (
                <div className={s.errorBanner} role="alert">
                  {error}
                </div>
              )}
              <div className={s.formFields}>
                <Field label={t("login.identifier")} required>
                  <Input
                    name="identifier"
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    dir="ltr"
                    placeholder={t("login.identifierPlaceholder")}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label={t("login.password")} required>
                  <Input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
              </div>
              <Button type="submit" size="md" className={s.fullBtn} loading={submitting}>
                {t("login.submit")}
              </Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardLoginPage;
