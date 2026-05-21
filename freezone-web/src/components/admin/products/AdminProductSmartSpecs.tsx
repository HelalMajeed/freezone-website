"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { FacetAttributeDef } from "@/lib/data";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";
import { proposeFiltersFromDisplay } from "@/lib/admin/admin-product-tab-status";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import { AdminLoadingState } from "@/components/admin/ui/AdminLoadingState";
import { AdminErrorState } from "@/components/admin/ui/AdminErrorState";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import {
  FilterValueControl,
  DisplaySpecInput,
  SpecTypeBadge,
  attributeTitle,
} from "@/components/admin/products/AdminProductAttributeControls";
import ui from "@/components/admin/ui/AdminUi.module.css";
import styles from "./AdminProductSmartSpecs.module.css";

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
        message="من صفحة القسم عرّف الفلاتر (أسماء وخياراتها) ثم أضف المنتج."
        action={
          categoryId ? (
            <Link className={ui.btnSm} to={`/admin/categories/${categoryId}/attributes`}>
              إدارة فلاتر القسم
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
      subtitle="نفس فلاتر القسم — اختر قيمة الفلتر واكتب المواصفة الموسعة بجانبها."
      badge={`${filterableSpecs.length + extendedSpecs.length} حقل`}
    >
      <p className={styles.flowHelp}>
        <strong>داخل القسم:</strong> تحدد الفلاتر وأسماءها وخياراتها (Select / Checkbox / Range).{" "}
        <strong>هنا عند إضافة المنتج:</strong> لكل فلتر تختار قيمة الفلتر (تظهر في صفحة القسم فقط) وتكتب
        المواصفة الموسعة (تظهر في صفحة المنتج).{" "}
        <strong>لا تخلط:</strong> لا تضع نصًا طويلًا في خانة الفلتر.
      </p>

      {filterableSpecs.length > 0 ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <button type="button" className={ui.btnSm} onClick={openDerivePreview}>
              توليد قيم الفلاتر من المواصفات الموسعة
            </button>
          </div>
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
                  تطبيق
                </button>
                <button type="button" className={ui.btnSm} onClick={() => setDerivePreview(null)}>
                  إلغاء
                </button>
              </div>
            </div>
          ) : null}

          <h3 className={styles.sectionTitle}>فلاتر القسم + مواصفة المنتج</h3>
          {filterableSpecs.map((attr) => {
            const displayVal = displaySpecs[attr.key] ?? "";
            const filterVal = filterSpecs[attr.key] ?? "";
            return (
              <div key={attr.key} className={styles.specCard}>
                <div className={styles.specCardHead}>
                  <strong>{attributeTitle(attr, locale)}</strong>
                  <SpecTypeBadge type={attr.type} />
                  <span className={styles.specKey}>{attr.key}</span>
                  {attr.unit ? <span className={styles.specKey}>{attr.unit}</span> : null}
                </div>
                <div className={styles.pairedGrid}>
                  <div>
                    <span className={styles.colLabel}>قيمة الفلتر — صفحة القسم</span>
                    <FilterValueControl
                      attr={attr}
                      value={filterVal}
                      onChange={(v) => onChangeFilter(attr.key, v)}
                      fieldStyle={fieldStyle}
                    />
                    <span className={styles.colHint}>تظهر في فلاتر الكتالوج فقط (قصيرة).</span>
                  </div>
                  <div>
                    <span className={styles.colLabel}>مواصفة موسعة — صفحة المنتج</span>
                    <DisplaySpecInput
                      attr={attr}
                      value={displayVal}
                      onChange={(v) => onChangeDisplay(attr.key, v)}
                      fieldStyle={fieldStyle}
                      onBlurNormalizeFilter={(normalized) => {
                        if (!filterVal.trim()) onChangeFilter(attr.key, normalized);
                      }}
                    />
                    <span className={styles.colHint}>تظهر في تفاصيل المنتج وبطاقة المواصفات.</span>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <p style={{ fontSize: 13, color: "var(--admin-muted)" }}>
          لا توجد فلاتر معرّفة لهذا القسم — أضف سمات قابلة للفلترة من إدارة القسم.
        </p>
      )}

      {extendedSpecs.length > 0 ? (
        <>
          <h3 className={styles.sectionTitle}>مواصفات عرض إضافية (صفحة المنتج فقط)</h3>
          {extendedSpecs.map((attr) => (
            <div key={attr.key} className={styles.displayOnlyCard}>
              <div className={styles.specCardHead}>
                <strong>{attributeTitle(attr, locale)}</strong>
                <SpecTypeBadge type={attr.type} />
                <span className={styles.specKey}>{attr.key}</span>
              </div>
              <DisplaySpecInput
                attr={attr}
                value={displaySpecs[attr.key] ?? ""}
                onChange={(v) => onChangeDisplay(attr.key, v)}
                fieldStyle={fieldStyle}
              />
              <span className={styles.colHint}>لا تظهر في فلاتر القسم — عرض داخل المنتج فقط.</span>
            </div>
          ))}
        </>
      ) : null}
    </AdminProductFormSection>
  );
}
