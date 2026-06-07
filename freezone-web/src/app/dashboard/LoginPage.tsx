import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { DashboardApiError, dashboardApi } from "@/lib/dashboard/api";
import { Button, Field, Input } from "@/components/dashboard/ui";
import { FREEZONE_Z_LOGO } from "@/lib/brand-assets";
import s from "./login.module.css";

// Statically replaced by Vite at build time: `true` in `vite dev`, `false`
// in `vite build`. The block below is dead-code-eliminated in production.
const DEV_MODE = import.meta.env.DEV;

const ERROR_MESSAGES: Record<string, { en: string; ar: string }> = {
  MISSING_CREDENTIALS: { en: "Enter your username and password.", ar: "الرجاء إدخال اسم المستخدم وكلمة المرور." },
  INVALID_CREDENTIALS: { en: "Wrong username or password.", ar: "اسم المستخدم أو كلمة المرور غير صحيحة." },
  ACCOUNT_DISABLED: { en: "This account is disabled.", ar: "هذا الحساب معطّل." },
  ACCOUNT_LOCKED: { en: "Too many failed attempts. Try again in 15 minutes.", ar: "محاولات كثيرة. حاول بعد ١٥ دقيقة." },
  NETWORK: { en: "Can't reach the server. Check your connection.", ar: "تعذّر الاتصال بالخادم." },
  DEV_BYPASS_DISABLED: {
    en: "Dev-login is not enabled on this API. Set DASHBOARD_DEV_BYPASS=true on freezone-api.",
    ar: "تخطي التطوير غير مفعّل على الـ API. اضبط DASHBOARD_DEV_BYPASS=true في freezone-api.",
  },
  DIRECT_LOGIN_DISABLED: {
    en: "Direct entry is turned off. Sign in with your username and password.",
    ar: "الدخول المباشر مُطفأ. سجّل الدخول باسم المستخدم وكلمة المرور.",
  },
};

export function DashboardLoginPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const status = useDashboardAuth((s) => s.status);
  const login = useDashboardAuth((s) => s.login);
  const refresh = useDashboardAuth((s) => s.refresh);
  const directEntry = useDashboardAuth((s) => s.directEntry);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [devBypassing, setDevBypassing] = useState(false);
  const [directEntering, setDirectEntering] = useState(false);
  const autoTriedDirect = useRef(false);

  const lang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";

  // If already signed in, bounce. Otherwise try passwordless direct entry once
  // (silent: if the API has direct login off, it 403s and we just show the form).
  useEffect(() => {
    if (status === "idle") void refresh();
    if (status === "authenticated") {
      navigate(next, { replace: true });
      return;
    }
    if (status === "unauthenticated" && !autoTriedDirect.current) {
      autoTriedDirect.current = true;
      directEntry()
        .then(() => navigate(next, { replace: true }))
        .catch(() => {
          /* direct entry disabled — fall back to the password form silently */
        });
    }
  }, [status, refresh, navigate, next, directEntry]);

  // Manual passwordless entry (shows errors, unlike the silent auto-attempt).
  const onDirectEntry = async () => {
    setErrorCode(null);
    setDirectEntering(true);
    try {
      await directEntry();
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof DashboardApiError) {
        setErrorCode(err.status === 403 ? "DIRECT_LOGIN_DISABLED" : err.code);
      } else {
        setErrorCode("NETWORK");
      }
    } finally {
      setDirectEntering(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorCode(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof DashboardApiError) {
        setErrorCode(err.code);
      } else {
        setErrorCode("NETWORK");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const errMsg = errorCode ? (ERROR_MESSAGES[errorCode] ?? { en: errorCode, ar: errorCode })[lang] : null;

  const onDevBypass = async () => {
    setErrorCode(null);
    setDevBypassing(true);
    try {
      await dashboardApi.post("/api/dashboard/auth/dev-login");
      await refresh();
      navigate(next, { replace: true });
    } catch (err) {
      // 404 → backend doesn't have DASHBOARD_DEV_BYPASS=true. Surface clearly.
      if (err instanceof DashboardApiError) {
        setErrorCode(
          err.status === 404
            ? "DEV_BYPASS_DISABLED"
            : err.code,
        );
      } else {
        setErrorCode("NETWORK");
      }
    } finally {
      setDevBypassing(false);
    }
  };

  return (
    <div className={s.wrap} dir={lang === "ar" ? "rtl" : "ltr"}>
      <aside className={s.brandPanel}>
        <div className={s.brandTop}>
          <span className={s.brandTopMark}>
            <img src={FREEZONE_Z_LOGO} alt="" width={48} height={48} style={{ display: "block" }} />
          </span>
          <div>
            <div className={s.brandTopName}>Freezone</div>
            <div className={s.brandTopSub}>{lang === "ar" ? "لوحة التحكم" : "Control Center"}</div>
          </div>
        </div>

        <div className={s.brandHero}>
          <h1 className={s.brandHeroTitle}>
            {lang === "ar"
              ? "إدارة موقعك من مكان واحد."
              : "Manage your entire storefront from one place."}
          </h1>
          <p className={s.brandHeroText}>
            {lang === "ar"
              ? "منتجات، طلبات، أقسام، محتوى، تصميم، فِرَق، صلاحيات — كلّه تحت يدك."
              : "Products, orders, categories, content, design, teams, permissions — all under your hands."}
          </p>
        </div>

        <div className={s.brandFooter}>
          <span>© Freezone</span>
          <span>•</span>
          <span>{lang === "ar" ? "آمن وسريع" : "Secure & fast"}</span>
        </div>
      </aside>

      <section className={s.formPanel}>
        <form className={s.form} onSubmit={onSubmit} noValidate>
          <h2 className={s.formTitle}>{lang === "ar" ? "تسجيل الدخول" : "Sign in"}</h2>
          <p className={s.formSubtitle}>
            {lang === "ar" ? "ادخل بحسابك للمتابعة." : "Enter your credentials to continue."}
          </p>

          {errMsg && <div className={s.errorBanner}>{errMsg}</div>}

          <Button
            type="button"
            size="lg"
            className={s.fullBtn}
            onClick={onDirectEntry}
            loading={directEntering}
          >
            {lang === "ar" ? "الدخول إلى لوحة التحكم" : "Enter dashboard"}
          </Button>

          <div className={s.bottomNote} style={{ marginTop: 4, marginBottom: 4 }}>
            {lang === "ar" ? "أو سجّل الدخول يدوياً" : "or sign in manually"}
          </div>

          <div className={s.formFields}>
            <Field label={lang === "ar" ? "اسم المستخدم" : "Username"}>
              <Input
                type="text"
                inputMode="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder={lang === "ar" ? "admin-free-zone" : "admin-free-zone"}
              />
            </Field>

            <Field label={lang === "ar" ? "كلمة المرور" : "Password"}>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </Field>
          </div>

          <Button type="submit" size="lg" className={s.fullBtn} loading={submitting}>
            {lang === "ar" ? "دخول" : "Sign in"}
          </Button>

          <div className={s.bottomNote}>
            {lang === "ar"
              ? "نسيت كلمة المرور؟ اطلب من المسؤول إعادة التعيين."
              : "Forgot password? Ask your admin to reset it."}
          </div>

          {DEV_MODE && (
            <div
              style={{
                marginTop: 18,
                padding: 12,
                border: "1px dashed #f59e0b",
                borderRadius: 8,
                background: "#fffbeb",
                color: "#92400e",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {lang === "ar" ? "وضع التطوير المحلي فقط" : "Local development only"}
              </div>
              <div style={{ marginBottom: 10 }}>
                {lang === "ar"
                  ? "زر التخطي يعمل فقط حين يكون الـ API محلياً مع DASHBOARD_DEV_BYPASS=true. لا يظهر في الإنتاج."
                  : "Skip works only when the local API has DASHBOARD_DEV_BYPASS=true. Removed entirely from production builds."}
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onDevBypass}
                loading={devBypassing}
              >
                {lang === "ar" ? "تخطي تسجيل الدخول (تطوير)" : "Skip login (dev)"}
              </Button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}

export default DashboardLoginPage;
