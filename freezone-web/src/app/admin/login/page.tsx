"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { freezoneApiUrl, getInternalApiFetchSignal } from "@/lib/api-internal";
import { FREEZONE_Z_LOGO } from "@/lib/brand-assets";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import s from "../login-dashboard.module.css";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/admin";

  const status = useDashboardAuth((s) => s.status);
  const refresh = useDashboardAuth((s) => s.refresh);

  const [directLogin, setDirectLogin] = useState<boolean | null>(null);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (status === "idle") void refresh();
    if (status === "authenticated") navigate(next, { replace: true });
  }, [status, refresh, navigate, next]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(freezoneApiUrl("/api/admin/login"), {
          credentials: "include",
          signal: getInternalApiFetchSignal(),
        });
        const j = (await r.json()) as {
          requirePassword?: boolean;
          authBypass?: boolean;
          directLogin?: boolean;
        };
        if (cancelled) return;
        const bypass = Boolean(j.authBypass || j.directLogin);
        setDirectLogin(bypass);
        if (!bypass) return;

        const dr = await fetch(freezoneApiUrl("/api/dashboard/auth/direct-login"), {
          method: "POST",
          credentials: "include",
          signal: getInternalApiFetchSignal(),
        });
        if (!dr.ok) {
          const legacy = await fetch(freezoneApiUrl("/api/admin/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            signal: getInternalApiFetchSignal(),
            body: JSON.stringify({ password: "" }),
          });
          if (!legacy.ok) {
            setLoginError("تعذّر الدخول المباشر");
            return;
          }
        }
        await refresh();
        if (!cancelled) navigate(next, { replace: true });
      } catch {
        if (!cancelled) {
          setDirectLogin(false);
          setLoginError("تعذّر الاتصال بالخادم");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, next, refresh]);

  const onDirectEnter = async () => {
    setLoginError("");
    try {
      const dr = await fetch(freezoneApiUrl("/api/dashboard/auth/direct-login"), {
        method: "POST",
        credentials: "include",
        signal: getInternalApiFetchSignal(),
      });
      if (!dr.ok) {
        await fetch(freezoneApiUrl("/api/admin/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password: "" }),
        });
      }
      await refresh();
      navigate(next, { replace: true });
    } catch {
      setLoginError("تعذّر الدخول");
    }
  };

  const brandMark = (
    <span className={s.brandTopMark}>
      <img src={FREEZONE_Z_LOGO} alt="" width={48} height={48} style={{ display: "block", borderRadius: 10 }} />
    </span>
  );

  if (directLogin === null || (directLogin && status !== "authenticated")) {
    return (
      <div className={s.wrap} dir="rtl">
        <aside className={s.brandPanel}>
          <div className={s.brandTop}>
            {brandMark}
            <div>
              <div className={s.brandTopName}>FreeZone</div>
              <div className={s.brandTopSub}>لوحة الإدارة</div>
            </div>
          </div>
        </aside>
        <section className={s.formPanel}>
          <p className={s.formSubtitle} style={{ textAlign: "center" }}>
            {loginError || "جاري الدخول…"}
          </p>
        </section>
      </div>
    );
  }

  if (directLogin) {
    return null;
  }

  return (
    <div className={s.wrap} dir="rtl">
      <aside className={s.brandPanel}>
        <div className={s.brandTop}>
          {brandMark}
          <div>
            <div className={s.brandTopName}>FreeZone</div>
            <div className={s.brandTopSub}>لوحة الإدارة</div>
          </div>
        </div>
        <div className={s.brandHero}>
          <h1 className={s.brandHeroTitle}>إدارة المتجر من مكان واحد</h1>
          <p className={s.brandHeroText}>الكتالوج، الطلبات، المحتوى، الفريق — كلّه هنا.</p>
        </div>
      </aside>

      <section className={s.formPanel}>
        <div className={s.form}>
          <h2 className={s.formTitle}>تسجيل الدخول</h2>
          <p className={s.formSubtitle}>الدخول المباشر معطّل على الخادم. فعّل ADMIN_SKIP_AUTH على Fly.</p>
          {loginError ? <div className={s.errorBanner}>{loginError}</div> : null}
          <button type="button" className={s.fullBtn} onClick={() => void onDirectEnter()}>
            محاولة دخول مباشر
          </button>
        </div>
        <p style={{ marginTop: 20, fontSize: 13, color: "#64748b", textAlign: "center" }}>
          <Link to="/ar">← العودة للمتجر</Link>
        </p>
      </section>
    </div>
  );
}
