"use client";

import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  fetchAdminDataQuality,
  type DataQualityTab,
} from "@/lib/admin/admin-dashboard-api";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import ui from "@/components/admin/ui/AdminUi.module.css";

const TABS: { id: DataQualityTab; label: string }[] = [
  { id: "missing_specs", label: "مواصفات ناقصة" },
  { id: "invalid_filters", label: "فلاتر غير صالحة" },
  { id: "missing_images", label: "بدون صور" },
  { id: "missing_brand", label: "بدون علامة" },
  { id: "legacy_specs", label: "Legacy specs" },
  { id: "categories_without_attributes", label: "أقسام بلا سمات" },
];

export default function AdminDataQualityPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as DataQualityTab) || "invalid_filters";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

  const q = useQuery({
    queryKey: ["admin-data-quality", tab, page],
    enabled: isDatabaseConfigured(),
    queryFn: () => fetchAdminDataQuality(tab, page),
  });

  const summary = q.data?.summary;

  const tabCounts = useMemo(
    () => ({
      missing_specs: summary?.productsMissingSpecs,
      invalid_filters: summary?.productsInvalidFilters,
      missing_images: summary?.productsMissingImages,
      legacy_specs: summary?.productsLegacySpecsOnly,
      categories_without_attributes: summary?.categoriesWithoutAttributes,
      missing_brand: summary?.productsMissingBrand,
    }),
    [summary],
  );

  return (
    <div className={ui.page}>
      <AdminPageHeader
        title="جودة البيانات"
        description="مراجعة المنتجات والفلاتر والمواصفات قبل النشر. لا يتم تعديل البيانات تلقائيًا من هذه الصفحة."
        actions={
          <Link className={ui.btnSm} to="/admin/classification">
            أدوات التصنيف →
          </Link>
        }
      />

      <div className={ui.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${ui.tab} ${tab === t.id ? ui.tabActive : ""}`}
            onClick={() => setParams({ tab: t.id, page: "1" })}
          >
            {t.label}
            {tabCounts[t.id] != null ? ` (${tabCounts[t.id]})` : ""}
          </button>
        ))}
      </div>

      <AdminSectionCard title={`نتائج: ${TABS.find((x) => x.id === tab)?.label ?? tab}`}>
        {q.isLoading ? (
          <div className={ui.skeleton} style={{ minHeight: 120 }} />
        ) : !q.data?.items?.length ? (
          <AdminEmptyState title="لا مشاكل في هذا التبويب" message="كل المنتجات تبدو سليمة لهذا المعيار." />
        ) : (
          <>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>المنتج / القسم</th>
                    <th>المشكلة</th>
                    <th>التفاصيل</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((row, i) => (
                    <tr key={`${row.productId}-${row.issue}-${i}`}>
                      <td>{row.productId || "—"}</td>
                      <td>
                        {row.productId ? (
                          <>
                            <strong>{row.nameEn}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--admin-muted)" }}>
                              {row.categoryName} ({row.categorySlug})
                            </div>
                          </>
                        ) : (
                          <strong>{row.nameEn}</strong>
                        )}
                      </td>
                      <td>
                        <AdminBadge variant={row.issue.includes("invalid") ? "error" : "warn"}>
                          {row.issue}
                        </AdminBadge>
                      </td>
                      <td style={{ maxWidth: 280, fontSize: "0.8rem" }}>{row.detail ?? "—"}</td>
                      <td>
                        {row.productId ? (
                          <>
                            <Link className={ui.btnSm} to={`/admin/products/edit/${row.productId}`}>
                              تعديل
                            </Link>
                            <button
                              type="button"
                              className={ui.btnSm}
                              style={{ marginInlineStart: 6 }}
                              onClick={() => void navigator.clipboard.writeText(String(row.productId))}
                            >
                              نسخ ID
                            </button>
                          </>
                        ) : row.categorySlug ? (
                          <Link className={ui.btnSm} to="/admin/categories">
                            الأقسام
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                className={ui.btnSm}
                disabled={page <= 1}
                onClick={() => setParams({ tab, page: String(page - 1) })}
              >
                السابق
              </button>
              <span style={{ fontSize: "0.8rem", color: "var(--admin-muted)", alignSelf: "center" }}>
                صفحة {page} — {q.data.total} إجمالي
              </span>
              <button
                type="button"
                className={ui.btnSm}
                disabled={page * 25 >= (q.data?.total ?? 0)}
                onClick={() => setParams({ tab, page: String(page + 1) })}
              >
                التالي
              </button>
            </div>
          </>
        )}
      </AdminSectionCard>
    </div>
  );
}
