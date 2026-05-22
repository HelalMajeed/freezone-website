"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { FacetAttributeDef } from "@/lib/data";
import { facetAttributeDisplayName } from "@/lib/facet-attributes";
import { normalizeFilterValue } from "@/lib/classification/filter-value";
import { freezoneApiUrl } from "@/lib/api-internal";
import styles from "./AdminProductSmartSpecs.module.css";

const TYPE_LABELS: Record<string, string> = {
  SELECT: "قائمة",
  MULTI_SELECT: "اختيار متعدد",
  RANGE: "نطاق",
  BOOLEAN: "نعم/لا",
  TEXT: "نص",
  COLOR: "لون",
};

/** قيمة الفلتر — Checkbox / Radio / Select / Range / Switch / Color chips. */
export function FilterValueControl({
  attr,
  value,
  onChange,
  fieldStyle,
  preferRadio = true,
  categoryId,
  onOptionsUpdated,
}: {
  attr: FacetAttributeDef;
  value: string;
  onChange: (v: string) => void;
  fieldStyle: CSSProperties;
  preferRadio?: boolean;
  categoryId?: number;
  onOptionsUpdated?: (key: string, options: string[]) => void;
}) {
  const [newOption, setNewOption] = useState("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");
  const type = attr.type ?? "SELECT";
  const canAddOption =
    categoryId != null &&
    (type === "SELECT" || type === "MULTI_SELECT" || type === "COLOR") &&
    attr.options?.length;

  async function submitNewOption() {
    const opt = newOption.trim();
    if (!opt || !categoryId) return;
    setAdding(true);
    setAddErr("");
    try {
      const res = await fetch(freezoneApiUrl(`/api/admin/categories/${categoryId}/attributes/option`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributeKey: attr.key, option: opt }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setAddErr(j?.error ?? "فشل إضافة الخيار");
        return;
      }
      const j = (await res.json()) as { options?: string[] };
      onOptionsUpdated?.(attr.key, j.options ?? [...(attr.options ?? []), opt]);
      onChange(opt);
      setNewOption("");
    } catch {
      setAddErr("تعذّر الاتصال");
    } finally {
      setAdding(false);
    }
  }

  const addOptionUi =
    canAddOption ? (
      <div className={styles.addOptionRow}>
        <input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          style={fieldStyle}
          placeholder="خيار جديد للقسم…"
          dir="ltr"
        />
        <button type="button" className={styles.addOptionBtn} disabled={adding} onClick={() => void submitNewOption()}>
          {adding ? "…" : "إضافة خيار"}
        </button>
        {addErr ? <span className={styles.addOptionErr}>{addErr}</span> : null}
      </div>
    ) : null;

  if (type === "BOOLEAN") {
    const checked = value === "true" || value === "1" || value === "yes" || value === "نعم";
    return (
      <label className={styles.switchRow}>
        <span
          className={`${styles.switchTrack} ${checked ? styles.switchTrackOn : ""}`}
          aria-hidden
        >
          <span className={styles.switchThumb} />
        </span>
        <input
          type="checkbox"
          checked={checked}
          className="sr-only"
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

  if (type === "COLOR" && attr.options?.length) {
    return (
      <>
        <div className={styles.colorChips} role="listbox" aria-label={attr.name_ar}>
          {attr.options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`${styles.colorChip} ${value === opt ? styles.colorChipActive : ""}`}
              onClick={() => onChange(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        {addOptionUi}
      </>
    );
  }

  if ((type === "SELECT" || type === "COLOR") && attr.options?.length) {
    const useRadio = preferRadio && attr.options.length <= 8;
    if (useRadio) {
      return (
        <>
          <div className={styles.radioGroup} role="radiogroup">
            {attr.options.map((opt) => (
              <label key={opt} className={styles.checkRow}>
                <input
                  type="radio"
                  name={`filter-${attr.key}`}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
            <label className={styles.checkRow}>
              <input type="radio" name={`filter-${attr.key}`} checked={!value} onChange={() => onChange("")} />
              <span>—</span>
            </label>
          </div>
          {addOptionUi}
        </>
      );
    }
    return (
      <>
        <select value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle}>
          <option value="">— اختر —</option>
          {attr.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {addOptionUi}
      </>
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
      <>
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
        {addOptionUi}
      </>
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
  attr: Pick<FacetAttributeDef, "key" | "name_en" | "name_ar">;
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
