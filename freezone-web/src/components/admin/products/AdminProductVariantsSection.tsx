"use client";

import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";

/** Product variants (RAM/Storage/Color SKUs) — scaffold until full variant API is wired. */
export function AdminProductVariantsSection() {
  return (
    <AdminProductFormSection
      title="المتغيرات (Variants)"
      subtitle="RAM / Storage / Color / SKU / Price / Stock / Image لكل متغير — قيد التطوير. استخدم المواصفات أعلاه للمنتج الأساسي."
      badge="قريباً"
    >
      <p style={{ margin: 0, fontSize: 13, color: "var(--admin-muted)" }}>
        عند تفعيل المتغيرات ستتمكن من إضافة عدة SKUs لنفس المنتج مع أسعار ومخزون وصور منفصلة.
      </p>
    </AdminProductFormSection>
  );
}
