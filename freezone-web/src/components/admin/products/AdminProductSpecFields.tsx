"use client";

import type { CSSProperties } from "react";
import type { FacetAttributeDef } from "@/lib/data";
import { facetAttributeDisplayName } from "@/lib/facet-attributes";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";
import { normalizeFilterValue } from "@/lib/classification/filter-value";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";

type Props = {
  attributes: FacetAttributeDef[];
  displaySpecs: Record<string, string>;
  filterSpecs: Record<string, string>;
  onChangeDisplay: (key: string, value: string) => void;
  onChangeFilter: (key: string, value: string) => void;
  fieldStyle: CSSProperties;
  locale?: "en" | "ar";
  loading?: boolean;
  /** When set, only render filterable or display-only sections (for tabbed editor). */
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
  const keyBadge = (
    <code style={{ fontSize: 11, opacity: 0.75 }}>
      {attr.key}
      {attr.required ? " *" : ""}
    </code>
  );

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
        placeholder="Core i7, 16, RTX 5070…"
        style={fieldStyle}
      />
    ));

  if (type === "BOOLEAN") {
    const checked = displayValue === "true" || displayValue === "1";
    return (
      <div style={{ display: "grid", gap: 8 }}>
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
          <span>
            {label} {keyBadge}
          </span>
        </label>
      </div>
    );
  }

  if (type === "MULTI_SELECT") {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span style={{ color: "var(--admin-muted)" }}>
            {label} {keyBadge}
            {attr.unit ? ` (${attr.unit})` : ""}
          </span>
          <input
            value={displayValue}
            onChange={(e) => onChangeDisplay(e.target.value)}
            placeholder={attr.options?.join(", ") ?? "8, 16, 32"}
            style={fieldStyle}
          />
          <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>قيم متعددة مفصولة بفاصلة</span>
        </label>
        {showFilterField ? (
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span style={{ color: "var(--admin-muted)" }}>قيمة الفلتر (مختصرة)</span>
            {filterControl}
          </label>
        ) : null}
      </div>
    );
  }

  if (type === "RANGE") {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span style={{ color: "var(--admin-muted)" }}>
            {showFilterField ? "قيمة العرض" : label} {keyBadge}
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
        <span style={{ color: "var(--admin-muted)" }}>
          {label} {keyBadge}
        </span>
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
        border: showFilterField ? "1px dashed var(--admin-border, #475569)" : "none",
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        <span style={{ color: "var(--admin-muted)" }}>
          {showFilterField ? "قيمة العرض (كاملة)" : label} {keyBadge}
        </span>
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
          <span style={{ color: "var(--admin-muted)" }}>قيمة الفلتر / Normalized (مختصرة)</span>
          {filterControl}
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
  section = "both",
}: Props) {
  const { filterableSpecs, extendedSpecs } = partitionFacetAttributes(attributes);
  const showFilter = section === "both" || section === "filter";
  const showDisplay = section === "both" || section === "display";

  if (loading) {
    return <p style={{ fontSize: 13, color: "var(--admin-muted)" }}>جاري تحميل مواصفات القسم…</p>;
  }

  if (!attributes.length) {
    return (
      <p style={{ fontSize: 13, color: "var(--admin-muted)" }}>
        لا توجد مواصفات معرّفة لهذا القسم. شغّل{" "}
        <code style={{ fontSize: 12 }}>npx tsx scripts/seed-classification-only.ts</code> لمزامنة التصنيف.
      </p>
    );
  }

  return (
    <>
      {showFilter ? (
        <AdminProductFormSection
          title="Filter Values"
          subtitle="قيم مختصرة للفلاتر فقط (Core i7، RTX 5070). النص الطويل في Display Specs."
          badge={`${filterableSpecs.length} حقل`}
        >
          {filterableSpecs.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--admin-muted)" }}>لا توجد فلاتر لهذا القسم.</p>
          ) : (
            filterableSpecs.map((attr) => (
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
            ))
          )}
        </AdminProductFormSection>
      ) : null}

      {showDisplay ? (
        <AdminProductFormSection
          title="Display Specs"
          subtitle="مواصفات صفحة المنتج — نص كامل (processor_full، gpu_full…)."
          badge={`${extendedSpecs.length} حقل`}
        >
          {extendedSpecs.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--admin-muted)" }}>لا توجد مواصفات تفصيلية إضافية.</p>
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
