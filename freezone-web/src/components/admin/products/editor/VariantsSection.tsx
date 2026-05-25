"use client";

import { useEffect, useState } from "react";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import { freezoneApiUrl } from "@/lib/api-internal";

type VariantRow = {
  id: number;
  sku: string;
  labelAr: string;
  quantity: number;
  priceOverride: number | null;
};

export function VariantsSection({ productId }: { productId: number }) {
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    void fetch(freezoneApiUrl(`/api/admin/products/${productId}/variants`), { credentials: "include" })
      .then((r) => r.json())
      .then((j: { variants?: VariantRow[] }) => {
        const list = j.variants ?? [];
        setVariants(list);
        setEnabled(list.length > 0);
      })
      .catch(() => undefined);
  }, [productId]);

  return (
    <AdminProductFormSection title="المتغيرات" subtitle="ألوان، مقاسات، سعات — عبر واجهة الاستيراد أو التعديل اليدوي">
      <label>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> هذا المنتج له متغيرات
      </label>
      {enabled && variants.length ? (
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th>التسمية</th>
              <th>SKU</th>
              <th>المخزون</th>
              <th>سعر إضافي</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id}>
                <td>{v.labelAr || v.sku}</td>
                <td>{v.sku}</td>
                <td>{v.quantity}</td>
                <td>{v.priceOverride ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : enabled ? (
        <p>لا متغيرات بعد — أضفها عبر استيراد Shopify أو API المتغيرات.</p>
      ) : null}
    </AdminProductFormSection>
  );
}
