"use client";

import { useId, useState } from "react";
import {
  LucideByName,
  LUCIDE_ICON_PICKER_OPTIONS,
  isKnownPickerKey,
  normalizeLucideKey,
} from "@/lib/lucide-icon-map";

type Props = {
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  /** تسمية الحقل */
  label: string;
  /** صنف إضافي لـ &lt;select&gt; */
  selectClassName?: string;
};

export function LucideIconSelect({ value, onChange, label, selectClassName }: Props) {
  const hintId = useId();
  const raw = (value ?? "").trim();
  const known = isKnownPickerKey(raw);
  const selectValue = known ? normalizeLucideKey(raw) : raw || "";
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 11, color: "var(--admin-muted)" }} htmlFor={hintId}>
        {label}
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--admin-surface-muted)",
            flexShrink: 0,
          }}
          aria-hidden
        >
          <LucideByName name={value ?? undefined} size={22} strokeWidth={1.5} />
        </div>
        <select
          id={hintId}
          className={selectClassName}
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") onChange(null);
            else onChange(v);
            setCustomOpen(false);
          }}
          style={{ flex: "1 1 200px", minWidth: 180 }}
        >
          <option value="">— اختر أيقونة —</option>
          {LUCIDE_ICON_PICKER_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.labelAr} — {o.labelEn} ({o.key})
            </option>
          ))}
          {!known && raw ? (
            <option value={raw}>
              {raw} (مفتاح محفوظ — غير في القائمة)
            </option>
          ) : null}
        </select>
      </div>
      <button
        type="button"
        onClick={() => setCustomOpen((o) => !o)}
        style={{
          alignSelf: "flex-start",
          fontSize: 11,
          color: "var(--admin-muted)",
          background: "none",
          border: "none",
          cursor: "pointer",
          textDecoration: "underline",
          padding: 0,
        }}
      >
        {customOpen ? "إخفاء الإدخال اليدوي" : "مفتاح Lucide مخصص (متقدم)"}
      </button>
      {customOpen ? (
        <input
          placeholder="مثال: laptop أو shield-check"
          value={raw}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : v);
          }}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #475569",
            background: "var(--admin-surface-inset)",
            color: "var(--admin-text)",
            fontSize: 13,
          }}
        />
      ) : null}
    </div>
  );
}
