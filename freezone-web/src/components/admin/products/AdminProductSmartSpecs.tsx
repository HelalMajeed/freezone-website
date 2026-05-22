"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { FacetAttributeDef } from "@/lib/data";
import {
  buildSmartSpecRows,
  standaloneDisplayAttributes,
} from "@/lib/classification/filter-display-link";
import { buildFilterDeriveSuggestions, type FilterDeriveSuggestion } from "@/lib/admin/smart-spec-derive";
import { smartSpecRowStatus } from "@/lib/admin/admin-product-spec-validation";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import { AdminLoadingState } from "@/components/admin/ui/AdminLoadingState";
import { AdminErrorState } from "@/components/admin/ui/AdminErrorState";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import {
  FilterValueControl,
  DisplaySpecInput,
} from "@/components/admin/products/AdminProductAttributeControls";
import ui from "@/components/admin/ui/AdminUi.module.css";
import styles from "./AdminProductSmartSpecs.module.css";

const STATUS_LABEL = {
  ok: "صحيح",
  warn: "ناقص",
  error: "خطأ",
} as const;

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
  categorySlug?: string;
  onRetry?: () => void;
  hideTechnicalDetails?: boolean;
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
  categorySlug,
  onRetry,
  hideTechnicalDetails = true,
}: Props) {
  const rows = useMemo(
    () => buildSmartSpecRows(attributes, categorySlug),
    [attributes, categorySlug],
  );
  const extraDisplay = useMemo(
    () => standaloneDisplayAttributes(attributes, rows),
    [attributes, rows],
  );
  const [deriveModal, setDeriveModal] = useState<FilterDeriveSuggestion[] | null>(null);
  const [deriveSelected, setDeriveSelected] = useState<Record<string, boolean>>({});

  function openDeriveModal() {
    const suggestions = buildFilterDeriveSuggestions(
      attributes,
      displaySpecs,
      filterSpecs,
      categorySlug,
    );
    if (!suggestions.length) return;
    const selected: Record<string, boolean> = {};
    for (const s of suggestions) {
      selected[s.filterKey] = s.confidence !== "low";
    }
    setDeriveSelected(selected);
    setDeriveModal(suggestions);
  }

  function applyDerive() {
    if (!deriveModal) return;
    for (const s of deriveModal) {
      if (deriveSelected[s.filterKey]) onChangeFilter(s.filterKey, s.suggested);
    }
    setDeriveModal(null);
  }

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

  return (
    <AdminProductFormSection
      title="المواصفات والفلاتر"
      subtitle="صف واحد لكل فلتر: قيمة الفلتر تظهر في صفحة القسم فقط؛ مواصفة المنتج تظهر في صفحة التفاصيل."
      badge={`${rows.length} مواصفة`}
    >
      <p className={styles.flowHelp}>
        <strong>قيمة الفلتر:</strong> مختصرة (Core i7، RTX 5070، 16 GB) — للفلاتر العامة في القسم.{" "}
        <strong>مواصفة المنتج:</strong> النص الكامل التقني — داخل صفحة المنتج فقط.
      </p>
      {rows.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <button type="button" className={ui.btnSm} onClick={openDeriveModal}>
            توليد قيم الفلاتر من المواصفات
          </button>
        </div>
      ) : null}

      {deriveModal && deriveModal.length > 0 ? (
        <div className={styles.deriveModal} role="dialog" aria-label="معاينة توليد الفلاتر">
          <strong>معاينة قبل التطبيق</strong>
          <table className={styles.specTable}>
            <thead>
              <tr>
                <th>تطبيق</th>
                <th>الحقل</th>
                <th>الحالي</th>
                <th>المقترح</th>
                <th>المصدر</th>
                <th>الثقة</th>
              </tr>
            </thead>
            <tbody>
              {deriveModal.map((s) => (
                <tr key={s.filterKey} className={s.confidence === "low" ? styles.rowWarn : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={deriveSelected[s.filterKey] ?? false}
                      onChange={(e) =>
                        setDeriveSelected((prev) => ({ ...prev, [s.filterKey]: e.target.checked }))
                      }
                    />
                  </td>
                  <td>{s.filterLabel}</td>
                  <td>{s.current || "—"}</td>
                  <td>{s.suggested}</td>
                  <td dir="ltr">{s.sourceKey}</td>
                  <td>
                    {s.confidence === "high" ? "عالية" : s.confidence === "medium" ? "متوسطة" : "منخفضة"}
                    {s.warning ? <span className={styles.warnText}> — {s.warning}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.deriveActions}>
            <button type="button" className={`${ui.btnSm} ${ui.btnPrimaryOutline}`} onClick={applyDerive}>
              تطبيق المحدد
            </button>
            <button type="button" className={ui.btnSm} onClick={() => setDeriveModal(null)}>
              إلغاء
            </button>
          </div>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.specTable}>
            <thead>
              <tr>
                <th>المواصفة</th>
                <th>قيمة الفلتر</th>
                <th>المواصفة التي تظهر في المنتج</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = smartSpecRowStatus(row, displaySpecs, filterSpecs);
                const title = locale === "ar" ? row.titleAr : row.titleEn;
                const displayKey = row.displaySpecKey;
                const displayVal = displayKey ? displaySpecs[displayKey] ?? "" : "";

                return (
                  <tr key={row.id}>
                    <td className={styles.specNameCell}>
                      <strong>{title}</strong>
                      {!hideTechnicalDetails && displayKey ? (
                        <span className={styles.specKey}>{displayKey}</span>
                      ) : null}
                    </td>
                    <td>
                      <div className={styles.filterStack}>
                        {row.filterAttrs.map((attr) => (
                          <div key={attr.key} className={styles.filterBlock}>
                            {row.filterAttrs.length > 1 ? (
                              <span className={styles.filterSubLabel}>
                                {locale === "ar" ? attr.name_ar : attr.name_en}
                              </span>
                            ) : null}
                            <FilterValueControl
                              attr={attr}
                              value={filterSpecs[attr.key] ?? ""}
                              onChange={(v) => onChangeFilter(attr.key, v)}
                              fieldStyle={fieldStyle}
                              preferRadio
                              categoryId={categoryId}
                              onOptionsUpdated={() => onRetry?.()}
                            />
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      {displayKey ? (
                        <DisplaySpecInput
                          attr={
                            attributes.find((a) => a.key === displayKey) ?? {
                              key: displayKey,
                              name_en: row.titleEn,
                              name_ar: row.titleAr,
                            }
                          }
                          value={displayVal}
                          onChange={(v) => onChangeDisplay(displayKey, v)}
                          fieldStyle={fieldStyle}
                        />
                      ) : (
                        <span className={styles.colHint}>فلتر فقط — بدون مواصفة عرض مرتبطة</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.colHint}>لا توجد فلاتر معرّفة — أضف سمات قابلة للفلترة من إدارة القسم.</p>
      )}

      {extraDisplay.length > 0 ? (
        <>
          <h3 className={styles.sectionTitle}>مواصفات عرض إضافية (صفحة المنتج فقط)</h3>
          <div className={styles.tableWrap}>
            <table className={styles.specTable}>
              <thead>
                <tr>
                  <th>المواصفة</th>
                  <th colSpan={2}>نص صفحة المنتج</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {extraDisplay.map((attr) => {
                  const val = displaySpecs[attr.key] ?? "";
                  const status = attr.required && !val.trim() ? "error" : val.trim() ? "ok" : "warn";
                  return (
                    <tr key={attr.key}>
                      <td>
                        <strong>{locale === "ar" ? attr.name_ar : attr.name_en}</strong>
                      </td>
                      <td colSpan={2}>
                        <DisplaySpecInput
                          attr={attr}
                          value={val}
                          onChange={(v) => onChangeDisplay(attr.key, v)}
                          fieldStyle={fieldStyle}
                        />
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
                          {STATUS_LABEL[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </AdminProductFormSection>
  );
}
