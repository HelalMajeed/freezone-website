"use client";

import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";

export type ProductVariantRow = {
  id: number;
  sku: string;
  labelEn: string;
  labelAr: string;
  priceOverride: number | null;
  quantity: number;
  active: boolean;
  sortOrder: number;
};

type Props = {
  warranty: string;
  originalPrice: number | null;
  sourceHandle: string | null;
  sourceUrl: string | null;
  importedAt: string | null;
  variants: ProductVariantRow[];
  onWarrantyChange: (value: string) => void;
  onOriginalPriceChange: (value: number | null) => void;
  onSourceUrlChange: (value: string) => void;
  fieldStyle: React.CSSProperties;
};

export function AdminProductImportMetaSection({
  warranty,
  originalPrice,
  sourceHandle,
  sourceUrl,
  importedAt,
  variants,
  onWarrantyChange,
  onOriginalPriceChange,
  onSourceUrlChange,
  fieldStyle,
}: Props) {
  return (
    <>
      <AdminProductFormSection
        title="الضمان والاستيراد"
        subtitle="ضمان العرض، السعر الأصلي قبل الزيادة، ومصدر الاستيراد (Global Iraq)"
      >
        <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>الضمان</label>
        <input
          placeholder="ضمان سنتين وكالة"
          value={warranty}
          onChange={(e) => onWarrantyChange(e.target.value)}
          style={fieldStyle}
        />

        <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>السعر الأصلي (قبل +35%)</label>
        <input
          placeholder="IQD — للمراجعة فقط"
          value={originalPrice != null ? String(originalPrice) : ""}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            onOriginalPriceChange(raw ? parseInt(raw, 10) : null);
          }}
          style={fieldStyle}
        />

        <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>source_handle (للاستيراد)</label>
        <input
          dir="ltr"
          readOnly
          value={sourceHandle ?? ""}
          placeholder="—"
          style={{ ...fieldStyle, opacity: sourceHandle ? 1 : 0.6 }}
        />

        <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>رابط المصدر</label>
        <input
          dir="ltr"
          type="url"
          placeholder="https://…"
          value={sourceUrl ?? ""}
          onChange={(e) => onSourceUrlChange(e.target.value)}
          style={fieldStyle}
        />

        {importedAt ? (
          <p style={{ margin: 0, fontSize: 12, color: "var(--admin-muted)" }}>
            آخر استيراد: {new Date(importedAt).toLocaleString("ar-IQ")}
          </p>
        ) : null}
      </AdminProductFormSection>

      <AdminProductFormSection
        title="المتغيرات (Variants)"
        subtitle="خيارات المنتج (OS، لون، إلخ)"
        badge={variants.length ? String(variants.length) : undefined}
      >
        {variants.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--admin-muted)" }}>لا توجد متغيرات لهذا المنتج.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "start", borderBottom: "1px solid #334155" }}>
                  <th style={{ padding: "8px 10px" }}>#</th>
                  <th style={{ padding: "8px 10px" }}>الخيار</th>
                  <th style={{ padding: "8px 10px" }}>SKU</th>
                  <th style={{ padding: "8px 10px" }}>السعر</th>
                  <th style={{ padding: "8px 10px" }}>المخزون</th>
                  <th style={{ padding: "8px 10px" }}>نشط</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "8px 10px" }}>{i + 1}</td>
                    <td style={{ padding: "8px 10px" }}>{v.labelAr || v.labelEn || "—"}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{v.sku || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      {v.priceOverride != null ? `${v.priceOverride.toLocaleString("ar-IQ")} د.ع` : "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>{v.quantity}</td>
                    <td style={{ padding: "8px 10px" }}>{v.active ? "نعم" : "لا"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminProductFormSection>
    </>
  );
}
