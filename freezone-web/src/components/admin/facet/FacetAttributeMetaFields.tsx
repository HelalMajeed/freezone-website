"use client";

import type { AttributeType, FacetAttributeDef } from "@/lib/data";
import { ATTRIBUTE_TYPES } from "@/lib/classification/presets";
import styles from "./facet-keys-workspace.module.css";

export type FacetMetaDraft = Pick<
  FacetAttributeDef,
  | "type"
  | "filterable"
  | "searchable"
  | "comparable"
  | "required"
  | "unit"
  | "options"
  | "displayGroup"
  | "displaySpecKey"
  | "displaySpecNameEn"
  | "displaySpecNameAr"
  | "displaySpecGroup"
  | "displaySpecRequired"
  | "linkDisplaySpec"
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
    displaySpecKey: a.displaySpecKey ?? "",
    displaySpecNameEn: a.displaySpecNameEn ?? "",
    displaySpecNameAr: a.displaySpecNameAr ?? "",
    displaySpecGroup: a.displaySpecGroup ?? "",
    displaySpecRequired: a.displaySpecRequired ?? false,
    linkDisplaySpec: a.linkDisplaySpec ?? Boolean(a.displaySpecKey),
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
    displaySpecKey: meta.displaySpecKey?.trim() || undefined,
    displaySpecNameEn: meta.displaySpecNameEn?.trim() || undefined,
    displaySpecNameAr: meta.displaySpecNameAr?.trim() || undefined,
    displaySpecGroup: meta.displaySpecGroup?.trim() || undefined,
    displaySpecRequired: meta.displaySpecRequired === true,
    linkDisplaySpec: meta.linkDisplaySpec === true || Boolean(meta.displaySpecKey?.trim()),
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

      {value.filterable !== false ? (
        <div className={styles.linkedDisplayBlock}>
          <p className={styles.linkedDisplayTitle}>
            {isAr ? "مواصفة العرض المرتبطة (صفحة المنتج)" : "Linked display spec (product page)"}
          </p>
          <label className={styles.facetMetaCheck}>
            <input
              type="checkbox"
              checked={value.linkDisplaySpec !== false}
              onChange={(e) => onChange({ ...value, linkDisplaySpec: e.target.checked })}
            />
            {isAr ? "له مواصفة عرض مرتبطة" : "Has linked display spec"}
          </label>
          {value.linkDisplaySpec !== false ? (
            <>
              <label className={styles.quickRenameLabel}>
                <span>{isAr ? "مفتاح مواصفة العرض (displaySpecKey)" : "Display spec key"}</span>
                <input
                  className={styles.customInp}
                  dir="ltr"
                  placeholder="processor_full"
                  value={value.displaySpecKey ?? ""}
                  onChange={(e) => onChange({ ...value, displaySpecKey: e.target.value })}
                />
              </label>
              <label className={styles.quickRenameLabel}>
                <span>{isAr ? "تسمية العرض (عربي)" : "Display label (AR)"}</span>
                <input
                  className={styles.customInp}
                  value={value.displaySpecNameAr ?? ""}
                  onChange={(e) => onChange({ ...value, displaySpecNameAr: e.target.value })}
                />
              </label>
              <label className={styles.quickRenameLabel}>
                <span>{isAr ? "تسمية العرض (إنجليزي)" : "Display label (EN)"}</span>
                <input
                  className={styles.customInp}
                  dir="ltr"
                  value={value.displaySpecNameEn ?? ""}
                  onChange={(e) => onChange({ ...value, displaySpecNameEn: e.target.value })}
                />
              </label>
              <label className={styles.quickRenameLabel}>
                <span>{isAr ? "مجموعة العرض" : "Display group"}</span>
                <input
                  className={styles.customInp}
                  dir="ltr"
                  placeholder="performance"
                  value={value.displaySpecGroup ?? ""}
                  onChange={(e) => onChange({ ...value, displaySpecGroup: e.target.value })}
                />
              </label>
              <label className={styles.facetMetaCheck}>
                <input
                  type="checkbox"
                  checked={value.displaySpecRequired === true}
                  onChange={(e) => onChange({ ...value, displaySpecRequired: e.target.checked })}
                />
                {isAr ? "مواصفة العرض مطلوبة عند وجود فلتر" : "Display spec required when filter set"}
              </label>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
