"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { freezoneApiUrl, getInternalApiFetchSignal } from "@/lib/api-internal";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { DashboardApiError } from "@/lib/dashboard/api";
import { Button, Field, Input } from "@/components/dashboard/ui";
import s from "../login-dashboard.module.css";

const ERROR_MESSAGES: Record<string, { ar: string }> = {
  MISSING_CREDENTIALS: { ar: "الرجاء إدخال البريد وكلمة المرور." },
  INVALID_CREDENTIALS: { ar: "البريد أو كلمة المرور غير صحيحة." },
  ACCOUNT_DISABLED: { ar: "هذا الحساب معطّل." },
  ACCOUNT_LOCKED: { ar: "محاولات كثيرة. حاول بعد ١٥ دقيقة." },
  NETWORK: { ar: "تعذّر الاتصال بالخادم." },
};

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/admin";

  const status = useDashboardAuth((s) => s.status);
  const login = useDashboardAuth((s) => s.login);
  const refresh = useDashboardAuth((s) => s.refresh);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [legacyPassword, setLegacyPassword] = useState("");
  const [requireLegacy, setRequireLegacy] = useState<boolean | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [legacyErr, setLegacyErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        const j = (await r.json()) as { requirePassword?: boolean; authBypass?: boolean };
        if (cancelled) return;
        setRequireLegacy(Boolean(j.requirePassword));
        if (j.authBypass) navigate(next, { replace: true });
      } catch {
        if (!cancelled) setRequireLegacy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, next]);

  const onDashboardSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorCode(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setErrorCode(err instanceof DashboardApiError ? err.code : "NETWORK");
    } finally {
      setSubmitting(false);
    }
  };

  const onLegacySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLegacyErr("");
    const res = await fetch(freezoneApiUrl("/api/admin/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: getInternalApiFetchSignal(),
      body: JSON.stringify({ password: requireLegacy ? legacyPassword : "" }),
    });
    if (!res.ok) {
      setLegacyErr(requireLegacy ? "كلمة المرور غير صحيحة" : "تعذر الدخول");
      return;
    }
    await refresh();
    navigate(next, { replace: true });
  };

  const errMsg = errorCode ? (ERROR_MESSAGES[errorCode]?.ar ?? errorCode) : null;

  return (
    <div className={s.wrap} dir="rtl">
      <aside className={s.brandPanel}>
        <div className={s.brandTop}>
          <span className={s.brandTopMark}>F</span>
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
        <form className={s.form} onSubmit={onDashboardSubmit} noValidate>
          <h2 className={s.formTitle}>تسجيل الدخول</h2>
          <p className={s.formSubtitle}>البريد وكلمة المرور (حساب فريق)</p>

          {errMsg && <div className={s.errorBanner}>{errMsg}</div>}

          <div className={s.formFields}>
            <Field label="البريد الإلكتروني">
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field label="كلمة المرور">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
          </div>

          <Button type="submit" size="lg" className={s.fullBtn} loading={submitting}>
            دخول
          </Button>
        </form>

        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            className={s.fullBtn}
            style={{ background: "transparent", border: "1px solid var(--fz-border, #e4e7ef)", color: "#475569" }}
            onClick={() => setShowLegacy((v) => !v)}
          >
            {showLegacy ? "إخفاء الدخول القديم" : "دخول بكلمة المرور القديمة (احتياطي)"}
          </button>
          {showLegacy && requireLegacy !== null && (
            <form className={s.form} onSubmit={onLegacySubmit} style={{ marginTop: 16 }}>
              {requireLegacy && (
                <Field label="كلمة مرور الإدارة (قديمة)">
                  <Input
                    type="password"
                    value={legacyPassword}
                    onChange={(e) => setLegacyPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </Field>
              )}
              {legacyErr && <div className={s.errorBanner}>{legacyErr}</div>}
              <Button type="submit" variant="secondary" className={s.fullBtn}>
                دخول بكلمة المرور
              </Button>
            </form>
          )}
        </div>

        <p style={{ marginTop: 20, fontSize: 13, color: "#64748b", textAlign: "center" }}>
          <Link to="/ar">← العودة للمتجر</Link>
        </p>
      </section>
    </div>
  );
}
