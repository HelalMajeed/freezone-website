"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import { freezoneApiUrl } from "@/lib/api-internal";

type VariantRow = {
  id?: number;
  sourceVariantId: string;
  sku: string;
  labelAr: string;
  labelEn: string;
  quantity: number;
  priceOverride: number | null;
  optionName1: string;
  optionValue1: string;
  optionName2: string;
  optionValue2: string;
};

function emptyRow(index: number): VariantRow {
  return {
    sourceVariantId: `manual-${Date.now()}-${index}`,
    sku: "",
    labelAr: "",
    labelEn: "",
    quantity: 0,
    priceOverride: null,
    optionName1: "",
    optionValue1: "",
    optionName2: "",
    optionValue2: "",
  };
}

function fromApi(v: {
  id: number;
  sourceVariantId: string | null;
  sku: string;
  labelAr: string;
  labelEn: string;
  quantity: number;
  priceOverride: number | null;
  optionName1: string | null;
  optionValue1: string | null;
  optionName2: string | null;
  optionValue2: string | null;
}): VariantRow {
  return {
    id: v.id,
    sourceVariantId: v.sourceVariantId ?? `existing-${v.id}`,
    sku: v.sku,
    labelAr: v.labelAr,
    labelEn: v.labelEn,
    quantity: v.quantity,
    priceOverride: v.priceOverride,
    optionName1: v.optionName1 ?? "",
    optionValue1: v.optionValue1 ?? "",
    optionName2: v.optionName2 ?? "",
    optionValue2: v.optionValue2 ?? "",
  };
}

export function VariantsSection({ productId }: { productId: number }) {
  const [enabled, setEnabled] = useState(false);
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(freezoneApiUrl(`/api/admin/products/${productId}/variants`), {
      credentials: "include",
    });
    if (!r.ok) return;
    const j = (await r.json()) as { variants?: Parameters<typeof fromApi>[0][] };
    const list = (j.variants ?? []).map(fromApi);
    setRows(list);
    setEnabled(list.length > 0);
    setLoaded(true);
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateRow(index: number, patch: Partial<VariantRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setEnabled(true);
    setRows((prev) => [...prev, emptyRow(prev.length)]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveVariants() {
    if (!enabled) {
      toast.success("تم تعطيل المتغيرات");
      return;
    }
    const payload = rows.filter((r) => r.sku.trim() || r.labelAr.trim());
    if (!payload.length) {
      toast.error("أضف متغيراً واحداً على الأقل (SKU أو تسمية)");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(freezoneApiUrl(`/api/admin/products/${productId}/variants`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variants: payload.map((r, i) => ({
            sourceVariantId: r.sourceVariantId,
            sku: r.sku.trim() || `sku-${productId}-${i}`,
            labelAr: r.labelAr.trim() || r.labelEn.trim(),
            labelEn: r.labelEn.trim() || r.labelAr.trim(),
            quantity: Math.max(0, r.quantity),
            priceOverride: r.priceOverride,
            optionName1: r.optionName1 || null,
            optionValue1: r.optionValue1 || null,
            optionName2: r.optionName2 || null,
            optionValue2: r.optionValue2 || null,
            sortOrder: i,
            active: true,
          })),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "فشل الحفظ");
      }
      toast.success(`تم حفظ ${payload.length} متغير`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل حفظ المتغيرات");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminProductFormSection
      title="المتغيرات"
      subtitle="محاور (لون، مقاس…) — SKU وسعر ومخزون لكل تركيبة"
    >
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            if (e.target.checked && rows.length === 0) addRow();
          }}
        />
        هذا المنتج له متغيرات (ألوان، مقاسات، سعات…)
      </label>

      {enabled ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button type="button" onClick={addRow} disabled={busy}>
              + إضافة صف
            </button>
            <button type="button" onClick={() => void saveVariants()} disabled={busy}>
              {busy ? "جارٍ الحفظ…" : "حفظ المتغيرات"}
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "min(100%, 720px)", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "start", borderBottom: "1px solid #334155" }}>
                  <th>التسمية (عربي)</th>
                  <th>SKU</th>
                  <th>محور 1</th>
                  <th>قيمة 1</th>
                  <th>محور 2</th>
                  <th>قيمة 2</th>
                  <th>المخزون</th>
                  <th>سعر إضافي</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.sourceVariantId} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td>
                      <input
                        value={r.labelAr}
                        onChange={(e) => updateRow(i, { labelAr: e.target.value })}
                        style={{ width: "100%" }}
                        dir="rtl"
                      />
                    </td>
                    <td>
                      <input
                        value={r.sku}
                        onChange={(e) => updateRow(i, { sku: e.target.value })}
                        style={{ width: "100%" }}
                        dir="ltr"
                      />
                    </td>
                    <td>
                      <input
                        value={r.optionName1}
                        onChange={(e) => updateRow(i, { optionName1: e.target.value })}
                        placeholder="لون"
                        style={{ width: "100%" }}
                      />
                    </td>
                    <td>
                      <input
                        value={r.optionValue1}
                        onChange={(e) => updateRow(i, { optionValue1: e.target.value })}
                        style={{ width: "100%" }}
                      />
                    </td>
                    <td>
                      <input
                        value={r.optionName2}
                        onChange={(e) => updateRow(i, { optionName2: e.target.value })}
                        placeholder="مقاس"
                        style={{ width: "100%" }}
                      />
                    </td>
                    <td>
                      <input
                        value={r.optionValue2}
                        onChange={(e) => updateRow(i, { optionValue2: e.target.value })}
                        style={{ width: "100%" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={r.quantity}
                        onChange={(e) => updateRow(i, { quantity: parseInt(e.target.value, 10) || 0 })}
                        style={{ width: 72 }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={r.priceOverride ?? ""}
                        onChange={(e) =>
                          updateRow(i, {
                            priceOverride: e.target.value === "" ? null : parseInt(e.target.value, 10) || 0,
                          })
                        }
                        style={{ width: 88 }}
                      />
                    </td>
                    <td>
                      <button type="button" onClick={() => removeRow(i)}>
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loaded ? <p style={{ color: "#94a3b8" }}>جارٍ التحميل…</p> : null}
          {loaded && rows.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>لا متغيرات — اضغط «إضافة صف» ثم «حفظ المتغيرات».</p>
          ) : null}
        </>
      ) : (
        <p style={{ color: "#94a3b8", marginTop: 8 }}>فعّل الخيار أعلاه لإدارة المتغيرات لهذا المنتج.</p>
      )}
    </AdminProductFormSection>
  );
}
