import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { DashboardApiError } from "@/lib/dashboard/api";
import { readAccessKey } from "@/lib/dashboard/secret-link";
import { Button } from "@/components/dashboard/ui";
import { FREEZONE_Z_LOGO } from "@/lib/brand-assets";
import s from "./login.module.css";

/**
 * Dashboard entry is SECRET-LINK ONLY — there is no username/password form.
 *  - /dashboard/login?key=<secret>  → verifies the key server-side, opens the
 *    dashboard, and strips the key from the address bar.
 *  - /dashboard/login (no key)      → shows "private link required", no session.
 *  - wrong key                      → clean error, no session, secret not shown.
 */

const ERROR_MESSAGES: Record<string, { en: string; ar: string }> = {
  DIRECT_LOGIN_TOKEN_INVALID: {
    en: "This access link is not valid. Ask the owner for a current link.",
    ar: "رابط الدخول غير صالح. اطلب من المالك رابطًا حديثًا.",
  },
  DIRECT_LOGIN_TOKEN_REQUIRED: {
    en: "Admin access requires a private access link.",
    ar: "يتطلب الدخول إلى لوحة التحكم رابطًا خاصًا.",
  },
  DIRECT_LOGIN_DISABLED: {
    en: "Direct admin access is turned off.",
    ar: "الدخول المباشر للوحة التحكم مُطفأ حاليًا.",
  },
  DIRECT_LOGIN_PRODUCTION_NOT_ACKNOWLEDGED: {
    en: "Direct admin access is not enabled on this environment.",
    ar: "الدخول المباشر غير مُفعّل على هذه البيئة.",
  },
  NETWORK: { en: "Can't reach the server. Check your connection.", ar: "تعذّر الاتصال بالخادم." },
};

type Phase = "checking" | "opening" | "needLink" | "error";

export function DashboardLoginPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const status = useDashboardAuth((sel) => sel.status);
  const refresh = useDashboardAuth((sel) => sel.refresh);
  const directLogin = useDashboardAuth((sel) => sel.directLogin);

  const [phase, setPhase] = useState<Phase>("checking");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const triedKey = useRef(false);

  const lang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";
  const key = readAccessKey(window.location.search);

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

    // Unauthenticated: only the secret link may create a session.
    if (!triedKey.current) {
      triedKey.current = true;
      if (!key) {
        setPhase("needLink");
        return;
      }
      setPhase("opening");
      directLogin(key)
        .then(() => {
          // Strip the secret from the address bar, then enter the dashboard.
          navigate(next, { replace: true });
        })
        .catch((err) => {
          setErrorCode(
            err instanceof DashboardApiError ? err.code : "NETWORK",
          );
          setPhase("error");
        });
    }
  }, [status, refresh, navigate, next, directLogin, key]);

  const errMsg = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.DIRECT_LOGIN_TOKEN_INVALID)[lang]
    : null;

  const isBusy = phase === "checking" || phase === "opening" || status === "idle" || status === "loading";

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
              ? "الدخول إلى لوحة التحكم يتم عبر رابط خاص آمن."
              : "Access to the control center is via a secure private link."}
          </p>
        </div>

        <div className={s.brandFooter}>
          <span>© Freezone</span>
          <span>•</span>
          <span>{lang === "ar" ? "آمن وسريع" : "Secure & fast"}</span>
        </div>
      </aside>

      <section className={s.formPanel}>
        <div className={s.form}>
          {isBusy && (
            <>
              <h2 className={s.formTitle}>{lang === "ar" ? "جارٍ فتح لوحة التحكم…" : "Opening dashboard…"}</h2>
              <p className={s.formSubtitle}>
                {lang === "ar" ? "يرجى الانتظار لحظة." : "Just a moment."}
              </p>
              <div className="dashboard-loader" aria-label="Loading" style={{ marginTop: 16 }} />
            </>
          )}

          {!isBusy && phase === "needLink" && (
            <>
              <h2 className={s.formTitle}>{lang === "ar" ? "دخول خاص مطلوب" : "Private access required"}</h2>
              <p className={s.formSubtitle}>
                {lang === "ar"
                  ? "يتطلب الدخول إلى لوحة التحكم رابطًا خاصًا. افتح الرابط السري الذي يحتفظ به المالك."
                  : "Admin access requires a private access link. Open the secret link kept by the owner."}
              </p>
            </>
          )}

          {!isBusy && phase === "error" && (
            <>
              <h2 className={s.formTitle}>{lang === "ar" ? "تعذّر الدخول" : "Couldn't sign in"}</h2>
              {errMsg && <div className={s.errorBanner}>{errMsg}</div>}
              <p className={s.formSubtitle} style={{ marginTop: 12 }}>
                {lang === "ar"
                  ? "افتح رابط الدخول الخاص الصحيح من جديد."
                  : "Open the correct private access link again."}
              </p>
              <Button
                type="button"
                size="md"
                variant="secondary"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setErrorCode(null);
                  setPhase("needLink");
                }}
              >
                {lang === "ar" ? "حسناً" : "OK"}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardLoginPage;
