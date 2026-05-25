"use client";

import type { CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { freezoneApiUrl } from "@/lib/api-internal";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { ACHIEVEMENTS } from "@/data/achievements";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { getDailyGoal, isDarkMode, setDarkMode } from "@/lib/admin/admin-user-prefs";

async function fetchMyStats() {
  const res = await fetch(freezoneApiUrl("/api/admin/operator-stats"), { credentials: "include" });
  if (!res.ok) throw new Error("stats");
  const j = (await res.json()) as { data?: { myDrafts: number; productsCreatedToday: number } };
  return j.data;
}

export default function AdminMePage() {
  const user = useDashboardAuth((s) => s.user);
  const mode = useDashboardAuth((s) => s.mode);
  const q = useQuery({
    queryKey: ["admin-me", user?.id],
    queryFn: fetchMyStats,
    retry: 1,
  });
  const publishedEstimate = (q.data?.myDrafts ?? 0) + (q.data?.productsCreatedToday ?? 0) * 10;
  const earned = ACHIEVEMENTS.filter((a) => publishedEstimate >= a.minProducts);
  const dark = isDarkMode();

  return (
    <div dir="rtl" style={{ width: "100%" }}>
      <AdminPageHeader
        title="صفحتي"
        description="معلوماتك، إحصائياتك، وتفضيلات العمل في لوحة الإدارة"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <section style={card}>
          <h2 style={h2}>معلوماتي</h2>
          <dl style={dl}>
            <dt>الاسم</dt>
            <dd>{user?.name ?? "—"}</dd>
            <dt>البريد</dt>
            <dd dir="ltr">{user?.email ?? "—"}</dd>
            <dt>الصلاحية</dt>
            <dd>{user?.role === "SUPER_ADMIN" ? "مدير عام" : user?.role ?? "—"}</dd>
          </dl>
          <Link to="/admin/profile" style={linkBtn}>
            تغيير كلمة المرور
          </Link>
          {mode === "legacy" ? (
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
              وضع الدخول المباشر — لإدارة الفريق استخدم حساب لوحة المشغّلين.
            </p>
          ) : null}
        </section>

        <section style={card}>
          <h2 style={h2}>إحصائياتي</h2>
          <dl style={dl}>
            <dt>هدف اليوم</dt>
            <dd>{getDailyGoal(user?.id ?? null)} منتج</dd>
            <dt>منتجات أنشأتها اليوم</dt>
            <dd>{q.data?.productsCreatedToday ?? "—"}</dd>
            <dt>مسوداتي</dt>
            <dd>{q.data?.myDrafts ?? "—"}</dd>
          </dl>
        </section>

        <section style={card}>
          <h2 style={h2}>تفضيلاتي</h2>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={dark}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
            الوضع الداكن
          </label>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>
            اللغة الافتراضية: عربي (من شريط الأدوات العلوي)
          </p>
        </section>
      </div>

      <section style={card}>
        <h2 style={h2}>إنجازات</h2>
        <ul style={{ margin: 0, paddingInlineStart: 20 }}>
          {earned.map((a) => (
            <li key={a.id} style={{ marginBottom: 8 }}>
              {a.icon} {a.titleAr} — {a.descAr}
            </li>
          ))}
          {earned.length === 0 ? <li>استمر — أول إنجاز عند 10 منتجات منشورة</li> : null}
        </ul>
      </section>

      <p style={{ marginTop: 16, fontSize: 13, color: "#64748b" }}>
        <Link to="/admin/audit">سجلّ نشاطي</Link>
        {" · "}
        <Link to="/admin/products">كل المنتجات</Link>
      </p>
    </div>
  );
}

const card: CSSProperties = {
  border: "1px solid var(--fz-border, #334155)",
  borderRadius: 12,
  padding: 20,
  background: "var(--fz-bg-elev, var(--admin-surface))",
};
const h2: CSSProperties = { margin: "0 0 12px", fontSize: "1.05rem" };
const dl: CSSProperties = { display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 12px", margin: 0 };
const linkBtn: CSSProperties = {
  display: "inline-block",
  marginTop: 12,
  color: "var(--fz-brand, #60a5fa)",
  fontWeight: 600,
};
