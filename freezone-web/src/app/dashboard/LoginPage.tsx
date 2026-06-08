import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { DashboardApiError } from "@/lib/dashboard/api";
import { Button } from "@/components/dashboard/ui";
import { FREEZONE_Z_LOGO } from "@/lib/brand-assets";
import s from "./login.module.css";

/**
 * Dashboard entry is PASSWORDLESS and DIRECT. Opening /dashboard or
 * /dashboard/login immediately creates an admin session (when the API has
 * ADMIN_DIRECT_LOGIN enabled) and lands the user on /dashboard. There is no
 * username/password form and no secret key.
 */

const ERROR_MESSAGES: Record<string, { en: string; ar: string }> = {
  DIRECT_LOGIN_DISABLED: {
    en: "Direct admin access is turned off on the server.",
    ar: "الدخول المباشر للوحة التحكم مُطفأ على الخادم.",
  },
  NETWORK: { en: "Can't reach the server. Check your connection.", ar: "تعذّر الاتصال بالخادم." },
};

export function DashboardLoginPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const status = useDashboardAuth((sel) => sel.status);
  const refresh = useDashboardAuth((sel) => sel.refresh);
  const directLogin = useDashboardAuth((sel) => sel.directLogin);

  const [errorCode, setErrorCode] = useState<string | null>(null);
  const tried = useRef(false);

  const lang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";

  const enter = () => {
    setErrorCode(null);
    directLogin()
      .then(() => navigate(next, { replace: true }))
      .catch((err) => {
        setErrorCode(err instanceof DashboardApiError ? err.code : "NETWORK");
      });
  };

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
    // Unauthenticated → auto direct entry once.
    if (!tried.current) {
      tried.current = true;
      enter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, refresh, navigate, next, directLogin]);

  const errMsg = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.NETWORK)[lang]
    : null;

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
        </div>
        <div className={s.brandFooter}>
          <span>© Freezone</span>
          <span>•</span>
          <span>{lang === "ar" ? "آمن وسريع" : "Secure & fast"}</span>
        </div>
      </aside>

      <section className={s.formPanel}>
        <div className={s.form}>
          {!errMsg ? (
            <>
              <h2 className={s.formTitle}>{lang === "ar" ? "جارٍ فتح لوحة التحكم…" : "Opening dashboard…"}</h2>
              <p className={s.formSubtitle}>{lang === "ar" ? "لحظة من فضلك." : "Just a moment."}</p>
              <div className="dashboard-loader" aria-label="Loading" style={{ marginTop: 16 }} />
            </>
          ) : (
            <>
              <h2 className={s.formTitle}>{lang === "ar" ? "تعذّر الدخول" : "Couldn't enter"}</h2>
              <div className={s.errorBanner}>{errMsg}</div>
              <Button type="button" size="md" style={{ marginTop: 16 }} onClick={enter}>
                {lang === "ar" ? "إعادة المحاولة" : "Try again"}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardLoginPage;
