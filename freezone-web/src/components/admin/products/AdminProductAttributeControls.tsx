"use client";

import type { CSSProperties } from "react";
import type { FacetAttributeDef } from "@/lib/data";
import { facetAttributeDisplayName } from "@/lib/facet-attributes";
import { normalizeFilterValue } from "@/lib/classification/filter-value";
import styles from "./AdminProductSmartSpecs.module.css";

const TYPE_LABELS: Record<string, string> = {
  SELECT: "قائمة",
  MULTI_SELECT: "اختيار متعدد",
  RANGE: "نطاق",
  BOOLEAN: "نعم/لا",
  TEXT: "نص",
  COLOR: "لون",
};

/** قيمة الفلتر فقط — تظهر في صفحة القسم (Checkbox / Select / Range …). */
export function FilterValueControl({
  attr,
  value,
  onChange,
  fieldStyle,
}: {
  attr: FacetAttributeDef;
  value: string;
  onChange: (v: string) => void;
  fieldStyle: CSSProperties;
}) {
  const type = attr.type ?? "SELECT";

  if (type === "BOOLEAN") {
    const checked = value === "true" || value === "1" || value === "yes" || value === "نعم";
    return (
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        />
        <span>{checked ? "نعم" : "لا"}</span>
      </label>
    );
  }

  if (type === "RANGE") {
    return (
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
        placeholder={attr.unit ? `رقم (${attr.unit})` : "رقم"}
      />
    );
  }

  if ((type === "SELECT" || type === "COLOR") && attr.options?.length) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle}>
        <option value="">— اختر —</option>
        {attr.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (type === "MULTI_SELECT" && attr.options?.length) {
    const selected = new Set(
      value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    return (
      <div className={styles.optionGroup}>
        {attr.options.map((opt) => (
          <label key={opt} className={styles.checkRow}>
            <input
              type="checkbox"
              checked={selected.has(opt)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(opt);
                else next.delete(opt);
                onChange(Array.from(next).join(", "));
              }}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={fieldStyle}
      placeholder="قيمة قصيرة للفلتر…"
      maxLength={64}
    />
  );
}

export function DisplaySpecInput({
  attr,
  value,
  onChange,
  onBlurNormalizeFilter,
  fieldStyle,
}: {
  attr: FacetAttributeDef;
  value: string;
  onChange: (v: string) => void;
  onBlurNormalizeFilter?: (normalized: string) => void;
  fieldStyle: CSSProperties;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v && onBlurNormalizeFilter) onBlurNormalizeFilter(normalizeFilterValue(attr.key, v));
      }}
      rows={3}
      style={{ ...fieldStyle, width: "100%", minHeight: 72, resize: "vertical" }}
      placeholder="المواصفة الموسعة كما تظهر داخل صفحة المنتج…"
    />
  );
}

export function SpecTypeBadge({ type }: { type?: string }) {
  const t = type ?? "SELECT";
  return <span className={styles.typeBadge}>{TYPE_LABELS[t] ?? t}</span>;
}

export function attributeTitle(attr: FacetAttributeDef, locale: "en" | "ar") {
  return facetAttributeDisplayName(attr, locale);
}
