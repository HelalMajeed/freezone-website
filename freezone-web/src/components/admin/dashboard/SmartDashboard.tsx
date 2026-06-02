"use client";

import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { freezoneApiUrl } from "@/lib/api-internal";
import { getDailyGoal, setDailyGoal } from "@/lib/admin/admin-user-prefs";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { useState } from "react";
import dashUi from "@/components/dashboard/ui/ui.module.css";

const SparkChart = lazy(() =>
  import("./SparkChart").then((m) => ({ default: m.SparkChart })),
);

type SmartData = {
  user: { id: number; name: string; email: string; role: string };
  todayAr: string;
  publishedThisWeek: number;
  myPendingReview: number;
  myDrafts: number;
  myChangesRequested: number;
  managerNotesCount: number;
  sparkline: number[];
  recentProducts: Array<{
    id: number;
    nameAr: string;
    nameEn: string;
    catalogStatus: string;
    updatedAt: string;
    imageUrl: string | null;
  }>;
  team: Array<{
    id: number;
    name: string;
    email: string;
    published: number;
    pendingReview: number;
    lastActivity: string | null;
  }>;
  warnings: Array<{ level: "warning" | "error"; message: string; href: string }>;
  isManager: boolean;
};

async function fetchSmart(): Promise<SmartData> {
  const res = await fetch(freezoneApiUrl("/api/admin/dashboard/smart"), { credentials: "include" });
  if (!res.ok) throw new Error("smart dashboard");
  const j = (await res.json()) as { data: SmartData };
  return j.data;
}

function KpiCard({
  label,
  value,
  href,
  highlight,
  children,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Link
      to={href}
      className={dashUi.kpi}
      style={{
        textDecoration: "none",
        border: highlight ? "2px solid var(--fz-warning)" : undefined,
      }}
    >
      <div className={dashUi.kpiLabel}>{label}</div>
      <div className={dashUi.kpiValue}>{value}</div>
      {children}
    </Link>
  );
}

export function SmartDashboard() {
  const user = useDashboardAuth((s) => s.user);
  const [goal, setGoal] = useState(() => getDailyGoal(user?.id ?? null));
  const q = useQuery({ queryKey: ["admin-smart-dashboard"], queryFn: fetchSmart, refetchInterval: 60_000 });

  if (q.isLoading) return <p>جاري تحميل لوحتك…</p>;
  if (q.isError || !q.data) return <p>تعذّر تحميل لوحة الذكية.</p>;

  const d = q.data;
  const todayCount = d.recentProducts.filter((p) => {
    const t = new Date(p.updatedAt);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return t >= start;
  }).length;
  const progress = Math.min(100, Math.round((todayCount / goal) * 100));

  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <h2 style={{ margin: 0, fontSize: "1.35rem" }}>
          مرحباً {d.user.name} — {d.todayAr}
        </h2>
        <p style={{ margin: "6px 0 0", color: "var(--fz-text-muted)", fontSize: 14 }}>
          لوحتك الذكية — ابدأ من هدف اليوم أو أضف منتجاً جديداً
        </p>
      </header>

      <div className={dashUi.kpiGrid}>
        <KpiCard label="منشور هذا الأسبوع" value={d.publishedThisWeek} href="/admin/products?catalogStatus=PUBLISHED">
          <Suspense fallback={null}>
            <SparkChart data={d.sparkline} />
          </Suspense>
        </KpiCard>
        <KpiCard
          label="قيد المراجعة"
          value={d.myPendingReview}
          href="/admin/products?catalogStatus=PENDING_REVIEW"
          highlight={d.myPendingReview > 0}
        />
        <KpiCard label="مسوداتك" value={d.myDrafts} href="/admin/products?catalogStatus=DRAFT" />
        <KpiCard label="سجل النشاط" value={d.managerNotesCount} href="/admin/audit" />
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 12,
          border: "1px solid var(--fz-border)",
          background: "var(--fz-surface)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <strong>هدف اليوم: {todayCount}/{goal} منتج</strong>
          <label style={{ fontSize: 13 }}>
            ضبط الهدف:
            <input
              type="number"
              min={1}
              max={100}
              value={goal}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10) || 10;
                setGoal(n);
                setDailyGoal(user?.id ?? null, n);
              }}
              style={{ width: 56, marginInlineStart: 8 }}
            />
          </label>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          style={{
            marginTop: 10,
            height: 10,
            borderRadius: 999,
            background: "#1e293b",
            overflow: "hidden",
          }}
        >
          <div style={{ width: `${progress}%`, height: "100%", background: "#10b981", transition: "width 0.3s" }} />
        </div>
      </div>

      <Link
        to="/admin/products/new"
        className={`${dashUi.btn} ${dashUi.btnPrimary}`}
        style={{ alignSelf: "flex-start", fontSize: "1.05rem", padding: "12px 20px" }}
      >
        إضافة منتج جديد ⌘N
      </Link>

      {d.warnings.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>تحذيرات</h3>
          {d.warnings.map((w) => (
            <Link
              key={w.message}
              to={w.href}
              style={{
                padding: 10,
                borderRadius: 8,
                background: w.level === "error" ? "#450a0a" : "#422006",
                color: w.level === "error" ? "#fecaca" : "#fde68a",
              }}
            >
              {w.message}
            </Link>
          ))}
        </div>
      ) : null}

      <section>
        <h3 style={{ margin: "0 0 10px" }}>آخر منتجات عملت عليها</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {d.recentProducts.map((p) => (
            <li
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 10,
                border: "1px solid var(--fz-border)",
                borderRadius: 8,
              }}
            >
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" width={40} height={40} style={{ borderRadius: 6, objectFit: "cover" }} />
              ) : (
                <span style={{ width: 40, height: 40, background: "#334155", borderRadius: 6 }} />
              )}
              <div style={{ flex: 1 }}>
                <strong>{p.nameAr || p.nameEn}</strong>
                <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>{p.catalogStatus}</div>
              </div>
              <Link to={`/admin/products/edit/${p.id}`}>متابعة</Link>
            </li>
          ))}
        </ul>
      </section>

      {d.isManager && d.team.length > 0 ? (
        <section>
          <h3 style={{ margin: "0 0 10px" }}>شبكة الفريق</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {d.team.map((m) => (
              <div key={m.id} style={{ padding: 12, border: "1px solid var(--fz-border)", borderRadius: 10 }}>
                <strong>{m.name}</strong>
                <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>{m.email}</div>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  منشور: {m.published} · مراجعة: {m.pendingReview}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
