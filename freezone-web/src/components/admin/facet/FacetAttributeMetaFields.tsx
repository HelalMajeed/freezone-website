"use client";

import type { AttributeType, FacetAttributeDef } from "@/lib/data";
import { ATTRIBUTE_TYPES } from "@/lib/classification/presets";
import styles from "./facet-keys-workspace.module.css";

export type FacetMetaDraft = Pick<
  FacetAttributeDef,
  "type" | "filterable" | "searchable" | "comparable" | "required" | "unit" | "options" | "displayGroup"
>;

type Props = {
  value: FacetMetaDraft;
  onChange: (next: FacetMetaDraft) => void;
  localeUi: "en" | "ar";
};

export function facetMetaFromAttribute(a: FacetAttributeDef): FacetMetaDraft {
  return {
    type: a.type ?? "SELECT",
    filterable: a.filterable ?? true,
    searchable: a.searchable ?? false,
    comparable: a.comparable ?? false,
    required: a.required ?? false,
    unit: a.unit ?? "",
    options: a.options ?? [],
    displayGroup: a.displayGroup ?? "specs",
  };
}

export function applyMetaToAttribute(a: FacetAttributeDef, meta: FacetMetaDraft): FacetAttributeDef {
  const options = (meta.options ?? []).map((x) => x.trim()).filter(Boolean);
  return {
    ...a,
    type: meta.type ?? "SELECT",
    filterable: meta.filterable ?? true,
    searchable: meta.searchable ?? false,
    comparable: meta.comparable ?? false,
    required: meta.required ?? false,
    unit: meta.unit?.trim() || undefined,
    displayGroup: meta.displayGroup?.trim() || "specs",
    options: options.length ? options : undefined,
  };
}

export function FacetAttributeMetaFields({ value, onChange, localeUi }: Props) {
  const isAr = localeUi === "ar";
  const optionsText = (value.options ?? []).join(", ");

  return (
    <div className={styles.metaFieldsBlock}>
      <label className={styles.quickRenameLabel}>
        <span>{isAr ? "نوع الحقل" : "Field type"}</span>
        <select
          className={styles.customInp}
          value={value.type ?? "SELECT"}
          onChange={(e) => onChange({ ...value, type: e.target.value as AttributeType })}
        >
          {ATTRIBUTE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.quickRenameLabel}>
        <span>{isAr ? "وحدة (اختياري)" : "Unit (optional)"}</span>
        <input
          className={styles.customInp}
          dir="ltr"
          placeholder="GB, Hz, inch…"
          value={value.unit ?? ""}
          onChange={(e) => onChange({ ...value, unit: e.target.value })}
        />
      </label>
      <label className={styles.quickRenameLabel} style={{ gridColumn: "1 / -1" }}>
        <span>{isAr ? "خيارات (للقوائم — مفصولة بفاصلة)" : "Options (SELECT — comma-separated)"}</span>
        <input
          className={styles.customInp}
          dir="ltr"
          disabled={value.type !== "SELECT" && value.type !== "MULTI_SELECT" && value.type !== "COLOR"}
          placeholder="8, 16, 32"
          value={optionsText}
          onChange={(e) =>
            onChange({
              ...value,
              options: e.target.value
                .split(/[,;|]/)
                .map((x) => x.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      <div className={styles.metaChecksRow}>
        <label className={styles.facetMetaCheck}>
          <input
            type="checkbox"
            checked={value.filterable !== false}
            onChange={(e) => onChange({ ...value, filterable: e.target.checked })}
          />
          {isAr ? "يظهر في الفلاتر" : "Visible in filters"}
        </label>
        <label className={styles.facetMetaCheck}>
          <input
            type="checkbox"
            checked={value.required === true}
            onChange={(e) => onChange({ ...value, required: e.target.checked })}
          />
          {isAr ? "مطلوب عند الإدخال" : "Required on save"}
        </label>
        <label className={styles.facetMetaCheck}>
          <input
            type="checkbox"
            checked={value.searchable === true}
            onChange={(e) => onChange({ ...value, searchable: e.target.checked })}
          />
          {isAr ? "قابل للبحث" : "Searchable"}
        </label>
        <label className={styles.facetMetaCheck}>
          <input
            type="checkbox"
            checked={value.comparable === true}
            onChange={(e) => onChange({ ...value, comparable: e.target.checked })}
          />
          {isAr ? "للمقارنة" : "Comparable"}
        </label>
      </div>
    </div>
  );
}
