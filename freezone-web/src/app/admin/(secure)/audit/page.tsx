"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { freezoneApiUrl, getInternalApiFetchSignal } from "@/lib/api-internal";
import { isDatabaseConfigured } from "@/lib/prisma";
import s from "../AdminDashboard.module.css";

type AuditRow = {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  payload: unknown;
  createdAt: string;
};

export default function AdminAuditPage() {
  const q = useQuery({
    queryKey: ["admin-audit-log"],
    enabled: isDatabaseConfigured(),
    queryFn: async () => {
      const res = await fetch(freezoneApiUrl("/api/admin/audit-log"), {
        credentials: "include",
        cache: "no-store",
        signal: getInternalApiFetchSignal(),
      });
      if (!res.ok) throw new Error("bad");
      return res.json() as Promise<{ rows: AuditRow[]; err?: boolean }>;
    },
  });

  const rows =
    q.data?.rows.map((r) => ({
      ...r,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date(r.createdAt as unknown as string).toISOString(),
    })) ?? [];
  const err = q.isError || q.data?.err === true;

  return (
    <div className={s.wrap}>
      <h1 className={s.title}>سجل التدقيق</h1>
      <p className={s.subtitle}>
        يُسجّل تلقائياً أهم عمليات الحفظ والتعديل من لوحة الإدارة (عند توفر قاعدة البيانات).
      </p>

      {!isDatabaseConfigured() && (
        <p style={{ color: "#fbbf24", marginBottom: 16 }}>قاعدة البيانات غير مفعّلة — لا يوجد سجل بعد.</p>
      )}
      {err && (
        <p style={{ color: "#f87171", marginBottom: 16 }}>تعذّر قراءة السجل — تحقق من الاتصال بقاعدة البيانات وخادم API.</p>
      )}

      {q.isLoading && isDatabaseConfigured() && <p style={{ color: "var(--admin-muted)" }}>جاري التحميل…</p>}

      {rows.length === 0 && isDatabaseConfigured() && !err && !q.isLoading && (
        <p style={{ color: "var(--admin-muted)" }}>لا توجد إدخالات بعد.</p>
      )}

      {rows.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #334155" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--admin-surface-inset)", textAlign: "right" }}>
                <th style={{ padding: 12, borderBottom: "1px solid #334155" }}>#</th>
                <th style={{ padding: 12, borderBottom: "1px solid #334155" }}>وقت</th>
                <th style={{ padding: 12, borderBottom: "1px solid #334155" }}>إجراء</th>
                <th style={{ padding: 12, borderBottom: "1px solid #334155" }}>كيان</th>
                <th style={{ padding: 12, borderBottom: "1px solid #334155" }}>معرّف</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--admin-border)" }}>
                  <td style={{ padding: 10, color: "#64748b" }}>{r.id}</td>
                  <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                    {new Date(r.createdAt).toLocaleString("ar-IQ", { hour12: false })}
                  </td>
                  <td style={{ padding: 10, color: "var(--admin-text)" }}>{r.action}</td>
                  <td style={{ padding: 10 }}>{r.entity}</td>
                  <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>{r.entityId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 13, color: "#64748b" }}>
        <Link to="/admin" style={{ color: "var(--admin-muted)" }}>
          ← العودة للوحة التحكم
        </Link>
      </p>
    </div>
  );
}
