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
  section?: "filter" | "display" | "both";
};

function AttributeField({
  attr,
  displayValue,
  filterValue,
  showFilterField,
  onChangeDisplay,
  onChangeFilter,
  fieldStyle,
  locale,
}: {
  attr: FacetAttributeDef;
  displayValue: string;
  filterValue: string;
  showFilterField: boolean;
  onChangeDisplay: (v: string) => void;
  onChangeFilter: (v: string) => void;
  fieldStyle: CSSProperties;
  locale: "en" | "ar";
}) {
  const label = facetAttributeDisplayName(attr, locale);
  const type = attr.type ?? "SELECT";

  const filterControl =
    showFilterField &&
    (attr.options?.length ? (
      <select value={filterValue} onChange={(e) => onChangeFilter(e.target.value)} style={fieldStyle}>
        <option value="">—</option>
        {attr.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : (
      <input
        value={filterValue}
        onChange={(e) => onChangeFilter(e.target.value)}
        placeholder="Core i7، RTX 5070، 16…"
        style={fieldStyle}
        maxLength={64}
      />
    ));

  if (type === "BOOLEAN") {
    const checked = displayValue === "true" || displayValue === "1";
    return (
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            const v = e.target.checked ? "true" : "false";
            onChangeDisplay(v);
            if (showFilterField) onChangeFilter(v);
          }}
        />
        <span>{label}</span>
      </label>
    );
  }

  if (type === "MULTI_SELECT") {
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        <span style={{ color: "var(--admin-muted)" }}>
          {label}
          {attr.unit ? ` (${attr.unit})` : ""}
        </span>
        <input
          value={displayValue}
          onChange={(e) => onChangeDisplay(e.target.value)}
          placeholder={attr.options?.join(", ") ?? "8, 16, 32"}
          style={fieldStyle}
        />
        {showFilterField ? (
          <>
            <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>قيمة الفلتر (مختصرة)</span>
            {filterControl}
          </>
        ) : null}
      </label>
    );
  }

  if (type === "RANGE") {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span style={{ color: "var(--admin-muted)" }}>
            {showFilterField ? "قيمة العرض" : label}
            {attr.unit ? ` (${attr.unit})` : ""}
          </span>
          <input
            type="number"
            step="any"
            value={displayValue}
            onChange={(e) => {
              onChangeDisplay(e.target.value);
              if (showFilterField && !filterValue.trim()) onChangeFilter(e.target.value);
            }}
            style={fieldStyle}
          />
        </label>
        {showFilterField ? (
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span style={{ color: "var(--admin-muted)" }}>قيمة الفلتر (رقم)</span>
            <input
              type="number"
              step="any"
              value={filterValue}
              onChange={(e) => onChangeFilter(e.target.value)}
              style={fieldStyle}
            />
          </label>
        ) : null}
      </div>
    );
  }

  if ((type === "SELECT" || type === "COLOR") && attr.options?.length && !showFilterField) {
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        <span style={{ color: "var(--admin-muted)" }}>{label}</span>
        <select value={displayValue} onChange={(e) => onChangeDisplay(e.target.value)} style={fieldStyle}>
          <option value="">—</option>
          {attr.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        padding: showFilterField ? 10 : 0,
        borderRadius: showFilterField ? 8 : 0,
        border: showFilterField ? "1px dashed var(--admin-border)" : "none",
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        <span style={{ color: "var(--admin-muted)" }}>{showFilterField ? "قيمة العرض (كاملة)" : label}</span>
        <textarea
          value={displayValue}
          onChange={(e) => {
            const v = e.target.value;
            onChangeDisplay(v);
            if (showFilterField && !filterValue.trim() && v.trim()) {
              onChangeFilter(normalizeFilterValue(attr.key, v));
            }
          }}
          rows={type === "TEXT" || showFilterField ? 3 : 1}
          style={{ ...fieldStyle, minHeight: 56, resize: "vertical" }}
        />
      </label>
      {showFilterField ? (
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span style={{ color: "var(--admin-muted)" }}>قيمة الفلتر (قصيرة للكتالوج)</span>
          {filterControl}
          <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>لا تستخدم نصًا تسويقيًا طويلًا هنا.</span>
        </label>
      ) : null}
    </div>
  );
}

export function AdminProductSpecFields({
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
  section = "both",
}: Props) {
  const { filterableSpecs, extendedSpecs } = partitionFacetAttributes(attributes);
  const showFilter = section === "both" || section === "filter";
  const showDisplay = section === "both" || section === "display";
  const [derivePreview, setDerivePreview] = useState<Record<string, { before: string; after: string }> | null>(null);

  const proposed = useMemo(
    () => proposeFiltersFromDisplay(attributes, displaySpecs, filterSpecs),
    [attributes, displaySpecs, filterSpecs],
  );

  if (loading) {
    return <AdminLoadingState message="جاري تحميل مواصفات القسم…" />;
  }

  if (error) {
    return <AdminErrorState message={error} onRetry={onRetry} />;
  }

  if (!attributes.length) {
    return (
      <AdminEmptyState
        title="لا توجد سمات لهذا القسم"
        message="أضف سمات الفلترة ومواصفات العرض من صفحة إدارة سمات القسم."
        action={
          categoryId ? (
            <Link className={ui.btnSm} to={`/admin/categories/${categoryId}/attributes`}>
              إدارة سمات القسم
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
    <>
      {showFilter ? (
        <AdminProductFormSection
          title="قيم الفلاتر"
          subtitle="قيم مختصرة تظهر في فلاتر صفحة القسم فقط — وليس في صفحة المنتج."
          badge={`${filterableSpecs.length} حقل`}
        >
          <p className={ui.helpBlock}>
            لا تضع نصوصًا تسويقية طويلة هنا. استخدم رموزًا قصيرة مثل Core i7 أو RTX 5070.
          </p>
          {filterableSpecs.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--admin-muted)" }}>لا توجد حقول فلترة لهذا القسم.</p>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <button type="button" className={ui.btnSm} onClick={openDerivePreview}>
                  توليد قيم الفلاتر من مواصفات العرض
                </button>
              </div>
              {derivePreview && Object.keys(derivePreview).length > 0 ? (
                <div className={ui.derivePreviewBox}>
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
                <p style={{ fontSize: 13, color: "var(--admin-muted)" }}>لا توجد قيم جديدة مقترحة من مواصفات العرض.</p>
              ) : null}
              {filterableSpecs.map((attr) => (
                <AttributeField
                  key={attr.key}
                  attr={attr}
                  displayValue={displaySpecs[attr.key] ?? ""}
                  filterValue={filterSpecs[attr.key] ?? ""}
                  showFilterField
                  onChangeDisplay={(v) => onChangeDisplay(attr.key, v)}
                  onChangeFilter={(v) => onChangeFilter(attr.key, v)}
                  fieldStyle={fieldStyle}
                  locale={locale}
                />
              ))}
            </>
          )}
        </AdminProductFormSection>
      ) : null}

      {showDisplay ? (
        <AdminProductFormSection
          title="مواصفات العرض"
          subtitle="هذه المواصفات تظهر داخل صفحة المنتج فقط ولا تُستخدم كفلاتر في الكتالوج."
          badge={`${extendedSpecs.length} حقل`}
        >
          {extendedSpecs.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--admin-muted)" }}>لا توجد مواصفات عرض إضافية لهذا القسم.</p>
          ) : (
            extendedSpecs.map((attr) => (
              <AttributeField
                key={attr.key}
                attr={attr}
                displayValue={displaySpecs[attr.key] ?? ""}
                filterValue=""
                showFilterField={false}
                onChangeDisplay={(v) => onChangeDisplay(attr.key, v)}
                onChangeFilter={() => {}}
                fieldStyle={fieldStyle}
                locale={locale}
              />
            ))
          )}
        </AdminProductFormSection>
      ) : null}
    </>
  );
}
