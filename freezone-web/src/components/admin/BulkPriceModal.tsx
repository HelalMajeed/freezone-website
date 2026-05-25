"use client";

import { useState } from "react";
import { bulkAdminProductsAction } from "@/lib/admin/admin-products-api";

export function BulkPriceModal({
  ids,
  open,
  onClose,
  onDone,
}: {
  ids: number[];
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"percent" | "delta" | "set">("percent");
  const [value, setValue] = useState("10");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function apply() {
    setBusy(true);
    try {
      const n = parseFloat(value) || 0;
      if (mode === "percent") await bulkAdminProductsAction("price_percent", ids, { percent: n });
      else if (mode === "delta") await bulkAdminProductsAction("price_fixed_delta", ids, { delta: Math.round(n) });
      else await bulkAdminProductsAction("price_set", ids, { price: Math.round(n) });
      onDone();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} dir="rtl" style={{ background: "#fff", padding: 20, borderRadius: 12, width: 360 }}>
        <h3>تعديل سعر جماعي ({ids.length} منتج)</h3>
        <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} style={{ width: "100%", marginBottom: 8 }}>
          <option value="percent">زيادة/إنقاص بنسبة %</option>
          <option value="delta">إنقاص/زيادة مبلغ ثابت (د.ع)</option>
          <option value="set">تعيين سعر موحّد</option>
        </select>
        <input type="number" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: "100%" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" disabled={busy} onClick={() => void apply()}>
            تطبيق
          </button>
        </div>
      </div>
    </div>
  );
}
