"use client";

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import styles from "./LoginPage.module.css";

export default function AdminLoginPage() {
  const [requirePassword, setRequirePassword] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/login");
        const j = (await r.json()) as { requirePassword?: boolean };
        if (!cancelled) setRequirePassword(Boolean(j.requirePassword));
      } catch {
        if (!cancelled) setRequirePassword(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password: requirePassword ? password : "" }),
    });
    if (!res.ok) {
      setErr(requirePassword ? "كلمة المرور غير صحيحة" : "تعذر الدخول — تحقق من الخادم.");
      return;
    }
    navigate("/admin", { replace: true });
  }

  if (requirePassword === null) {
    return (
      <div className={styles.loading}>
        جاري التحميل…
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>دخول الإدارة</h1>
      <p className={styles.sub}>
        لوحة التحكم والمحتوى
        {!requirePassword && " (دخول مباشر — فعّل كلمة المرور في الإنتاج عبر ADMIN_REQUIRE_PASSWORD)"}
      </p>
      <form onSubmit={submit}>
        {requirePassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            autoComplete="current-password"
            className={styles.input}
          />
        )}
        {err && <p className={styles.err}>{err}</p>}
        <button type="submit" className={styles.btn}>
          دخول
        </button>
      </form>
      <p style={{ marginTop: 20, fontSize: 13, color: "#64748b", textAlign: "center" }}>
        <Link to="/en" style={{ color: "var(--admin-muted)" }}>
          ← العودة للموقع
        </Link>
      </p>
    </div>
  );
}
