"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { isDatabaseConfigured } from "@/lib/prisma";
import { fetchClassificationPreview } from "@/lib/admin/admin-dashboard-api";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import ui from "@/components/admin/ui/AdminUi.module.css";
import cls from "./AdminClassificationPage.module.css";

const CATEGORIES = [
  { slug: "laptops", label: "لابتوب" },
  { slug: "phones", label: "هواتف" },
  { slug: "gaming", label: "ألعاب" },
];

export default function AdminClassificationPage() {
  const [slug, setSlug] = useState("laptops");
  const [run, setRun] = useState(false);

  const q = useQuery({
    queryKey: ["classification-preview", slug],
    enabled: isDatabaseConfigured() && run,
    queryFn: () => fetchClassificationPreview(slug),
  });

  const preview = q.data as {
    category?: { name: string; slug: string };
    dryRunOnly?: boolean;
    manualCommand?: string;
    applyCommand?: string;
    summary?: { wouldChange: number; total: number };
    previews?: {
      productId: number;
      ok: boolean;
      changed: boolean;
      before: Record<string, string | null>;
      after: Record<string, string | null>;
      reason?: string;
    }[];
  };

  return (
    <div className={ui.page}>
      <AdminPageHeader
        title="أدوات التصنيف والفلاتر"
        description="معاينة dry-run لاستخراج قيم الفلاتر من مواصفات العرض. التطبيق الفعلي يتطلب تأكيدًا يدويًا على الخادم."
      />

      <AdminSectionCard title="إعداد المعاينة">
        <div className={cls.setupRow}>
          <label>
            القسم:
            <select
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setRun(false);
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={ui.btnSm} onClick={() => setRun(true)} disabled={q.isFetching}>
            تشغيل dry-run
          </button>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--admin-muted)", margin: 0 }}>
          لا يتم تشغيل <code>prisma db seed</code> ولا حذف منتجات. إصلاح اللابتوبات:{" "}
          <code>repair-laptop-filter-values.ts</code>
        </p>
      </AdminSectionCard>

      {run && q.isLoading ? <div className={ui.skeleton} style={{ minHeight: 100 }} /> : null}

      {preview?.summary ? (
        <AdminSectionCard
          title={`نتيجة المعاينة — ${preview.category?.name ?? slug}`}
          action={
            <AdminBadge variant={preview.summary.wouldChange > 0 ? "warn" : "ok"}>
              {preview.summary.wouldChange} / {preview.summary.total} سيتغيّر
            </AdminBadge>
          }
        >
          {preview.manualCommand ? (
            <>
              <p style={{ fontSize: "0.85rem", margin: "0 0 8px" }}>
                <strong>أمر dry-run على Fly:</strong>
              </p>
              <pre className={ui.codeBlock}>{preview.manualCommand}</pre>
              <p style={{ fontSize: "0.85rem", margin: "12px 0 8px" }}>
                <strong>تطبيق الإصلاح (بعد المراجعة):</strong>
              </p>
              <pre className={ui.codeBlock}>{preview.applyCommand}</pre>
            </>
          ) : null}

          {!preview.previews?.length ? (
            <AdminEmptyState title="لا منتجات في هذا القسم" />
          ) : (
            <div className={cls.previewList}>
              {preview.previews
                .filter((p) => p.changed || !p.ok)
                .slice(0, 40)
                .map((p) => (
                  <article key={p.productId} className={cls.previewCard}>
                    <div className={cls.previewHead}>
                      <span className={cls.previewId}>#{p.productId}</span>
                      {!p.ok ? (
                        <AdminBadge variant="error">{p.reason ?? "skip"}</AdminBadge>
                      ) : p.changed ? (
                        <AdminBadge variant="warn">سيتغيّر</AdminBadge>
                      ) : (
                        <AdminBadge variant="ok">بدون تغيير</AdminBadge>
                      )}
                    </div>
                    <div className={cls.compareStack}>
                      <div className={cls.compareRow}>
                        <span className={cls.compareLabel}>gpu_model</span>
                        <span className={cls.compareValue}>
                          <strong>قبل:</strong> {p.before?.gpu_model ?? "—"}
                          <br />
                          <strong>بعد:</strong> {p.after?.gpu_model ?? "—"}
                        </span>
                      </div>
                      <div className={cls.compareRow}>
                        <span className={cls.compareLabel}>processor_family</span>
                        <span className={cls.compareValue}>
                          <strong>قبل:</strong> {p.before?.processor_family ?? "—"}
                          <br />
                          <strong>بعد:</strong> {p.after?.processor_family ?? "—"}
                        </span>
                      </div>
                      <div className={cls.compareRow}>
                        <span className={cls.compareLabel}>screen_size</span>
                        <span className={cls.compareValue}>
                          <strong>قبل:</strong> {p.before?.screen_size ?? "—"}
                          <br />
                          <strong>بعد:</strong> {p.after?.screen_size ?? "—"}
                        </span>
                      </div>
                    </div>
                    <div className={cls.previewActions}>
                      <Link className={ui.btnSm} to={`/admin/products/edit/${p.productId}`}>
                        تعديل المنتج
                      </Link>
                    </div>
                  </article>
                ))}
            </div>
          )}

          <p style={{ marginTop: 16, fontSize: "0.8rem", color: "var(--admin-muted)" }}>
            تشغيل الإصلاح من الواجهة غير مفعّل عمدًا — استخدم SSH بعد مراجعة dry-run.{" "}
            <Link to="/admin/data-quality?tab=invalid_filters">جودة البيانات</Link>
          </p>
        </AdminSectionCard>
      ) : null}
    </div>
  );
}
