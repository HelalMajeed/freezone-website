"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { FacetAttributeDef } from "@/lib/data";
import { facetAttributeDisplayName } from "@/lib/facet-attributes";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";
import { normalizeFilterValue } from "@/lib/classification/filter-value";
import { proposeFiltersFromDisplay } from "@/lib/admin/admin-product-tab-status";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import { AdminLoadingState } from "@/components/admin/ui/AdminLoadingState";
import { AdminErrorState } from "@/components/admin/ui/AdminErrorState";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import ui from "@/components/admin/ui/AdminUi.module.css";

type Props = {
  attributes: FacetAttributeDef[];
  displaySpecs: Record<string, string>;
  filterSpecs: Record<string, string>;
  onChangeDisplay: (key: string, value: string) => void;
  onChangeFilter: (key: string, value: string) => void;
  fieldStyle: CSSProperties;
  locale?: "en" | "ar";
  loading?: boolean;
  error?: string | null;
  categoryId?: number;
  onRetry?: () => void;
};

export function AdminProductSmartSpecs({
  attributes,
  displaySpecs,
  filterSpecs,
  onChangeDisplay,
  onChangeFilter,
  fieldStyle,
  locale = "ar",
  loading,
  error,
  categoryId,
  onRetry,
}: Props) {
  const { filterableSpecs, extendedSpecs } = partitionFacetAttributes(attributes);
  const allRows = useMemo(() => [...filterableSpecs, ...extendedSpecs], [filterableSpecs, extendedSpecs]);
  const [derivePreview, setDerivePreview] = useState<Record<string, { before: string; after: string }> | null>(null);

  const proposed = useMemo(
    () => proposeFiltersFromDisplay(attributes, displaySpecs, filterSpecs),
    [attributes, displaySpecs, filterSpecs],
  );

  if (loading) return <AdminLoadingState message="جاري تحميل مواصفات القسم…" />;
  if (error) return <AdminErrorState message={error} onRetry={onRetry} />;
  if (!attributes.length) {
    return (
      <AdminEmptyState
        title="لا توجد سمات لهذا القسم"
        message="عرّف الفلاتر ومواصفات العرض من صفحة القسم أولاً."
        action={
          categoryId ? (
            <Link className={ui.btnSm} to={`/admin/categories/${categoryId}?tab=filters`}>
              إدارة الفلاتر والمواصفات
            </Link>
          ) : undefined
        }
      />
    );
  }

  function openDerivePreview() {
    const diff: Record<string, { before: string; after: string }> = {};
    for (const attr of filterableSpecs) {
      const before = filterSpecs[attr.key] ?? "";
      const after = proposed[attr.key] ?? "";
      if (after && after !== before) diff[attr.key] = { before, after };
    }
    setDerivePreview(diff);
  }

  function applyDerived() {
    if (!derivePreview) return;
    for (const [key, { after }] of Object.entries(derivePreview)) {
      onChangeFilter(key, after);
    }
    setDerivePreview(null);
  }

  return (
    <AdminProductFormSection
      title="المواصفات الذكية"
      subtitle="مواصفة المنتج الكاملة وقيمة الفلتر المختصرة في جدول واحد — كما تظهر في صفحة المنتج والكتالوج."
      badge={`${allRows.length} حقل`}
    >
      <p className={ui.helpBlock}>
        <strong>صفحة المنتج:</strong> النص الكامل في عمود «مواصفة المنتج».{" "}
        <strong>فلاتر القسم:</strong> القيم القصيرة في عمود «قيمة الفلتر» (للحقول القابلة للفلترة فقط).
      </p>

      {filterableSpecs.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          <button type="button" className={ui.btnSm} onClick={openDerivePreview}>
            توليد قيم الفلاتر تلقائيًا من المواصفات
          </button>
        </div>
      ) : null}

      {derivePreview && Object.keys(derivePreview).length > 0 ? (
        <div className={ui.derivePreviewBox} style={{ marginBottom: 16 }}>
          <strong>معاينة قبل التطبيق</strong>
          <table className={ui.table} style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>الحقل</th>
                <th>قبل</th>
                <th>بعد</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(derivePreview).map(([key, row]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{row.before || "—"}</td>
                  <td>{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className={`${ui.btnSm} ${ui.btnPrimaryOutline}`} onClick={applyDerived}>
              تطبيق القيم المقترحة
            </button>
            <button type="button" className={ui.btnSm} onClick={() => setDerivePreview(null)}>
              إلغاء
            </button>
          </div>
        </div>
      ) : derivePreview ? (
        <p style={{ fontSize: 13, color: "var(--admin-muted)", marginBottom: 12 }}>
          لا توجد قيم فلاتر جديدة مقترحة من المواصفات الحالية.
        </p>
      ) : null}

      <div style={{ overflowX: "auto" }}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th>المواصفة</th>
              <th>تظهر في صفحة المنتج</th>
              <th>تظهر في الفلاتر</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((attr) => {
              const label = facetAttributeDisplayName(attr, locale);
              const isFilter = attr.filterable === true;
              const displayVal = displaySpecs[attr.key] ?? "";
              const filterVal = filterSpecs[attr.key] ?? "";
              return (
                <tr key={attr.key}>
                  <td style={{ minWidth: 120, verticalAlign: "top" }}>
                    <strong>{label}</strong>
                    <div style={{ fontSize: 11, color: "var(--admin-muted)", direction: "ltr" }}>{attr.key}</div>
                    {attr.unit ? (
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>{attr.unit}</div>
                    ) : null}
                  </td>
                  <td style={{ minWidth: 220, verticalAlign: "top" }}>
                    <textarea
                      value={displayVal}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChangeDisplay(attr.key, v);
                        if (isFilter && !filterVal.trim() && v.trim()) {
                          onChangeFilter(attr.key, normalizeFilterValue(attr.key, v));
                        }
                      }}
                      rows={attr.type === "TEXT" || isFilter ? 3 : 2}
                      style={{ ...fieldStyle, width: "100%", minHeight: 56, resize: "vertical" }}
                      placeholder="النص الكامل كما يظهر للعميل…"
                    />
                  </td>
                  <td style={{ minWidth: 160, verticalAlign: "top" }}>
                    {isFilter ? (
                      attr.options?.length ? (
                        <select
                          value={filterVal}
                          onChange={(e) => onChangeFilter(attr.key, e.target.value)}
                          style={{ ...fieldStyle, width: "100%" }}
                        >
                          <option value="">—</option>
                          {attr.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={filterVal}
                          onChange={(e) => onChangeFilter(attr.key, e.target.value)}
                          style={{ ...fieldStyle, width: "100%" }}
                          placeholder="Core i7، RTX 5070، 16…"
                          maxLength={64}
                        />
                      )
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--admin-muted)" }}>— (عرض فقط)</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminProductFormSection>
  );
}
