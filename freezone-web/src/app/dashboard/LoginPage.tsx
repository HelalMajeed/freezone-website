import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { DashboardApiError } from "@/lib/dashboard/api";
import { Button, Field, Input } from "@/components/dashboard/ui";
import { FREEZONE_Z_LOGO } from "@/lib/brand-assets";
import s from "./login.module.css";

const ERROR_MESSAGES: Record<string, { en: string; ar: string }> = {
  MISSING_CREDENTIALS: { en: "Enter your email and password.", ar: "الرجاء إدخال البريد وكلمة المرور." },
  INVALID_CREDENTIALS: { en: "Wrong email or password.", ar: "البريد أو كلمة المرور غير صحيحة." },
  ACCOUNT_DISABLED: { en: "This account is disabled.", ar: "هذا الحساب معطّل." },
  ACCOUNT_LOCKED: { en: "Too many failed attempts. Try again in 15 minutes.", ar: "محاولات كثيرة. حاول بعد ١٥ دقيقة." },
  NETWORK: { en: "Can't reach the server. Check your connection.", ar: "تعذّر الاتصال بالخادم." },
};

export function DashboardLoginPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const status = useDashboardAuth((s) => s.status);
  const login = useDashboardAuth((s) => s.login);
  const refresh = useDashboardAuth((s) => s.refresh);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";

  // If already signed in, bounce
  useEffect(() => {
    if (status === "idle") void refresh();
    if (status === "authenticated") navigate(next, { replace: true });
  }, [status, refresh, navigate, next]);

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

          <div className={s.formFields}>
            <Field label={lang === "ar" ? "البريد الإلكتروني" : "Email"}>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder={lang === "ar" ? "you@freezone-iq.com" : "you@freezone-iq.com"}
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
        </form>
      </section>
    </div>
  );
}

export default DashboardLoginPage;
