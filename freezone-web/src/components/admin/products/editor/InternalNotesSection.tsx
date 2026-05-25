"use client";

import type { UseFormRegister } from "react-hook-form";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import type { ProductEditorValues } from "@/lib/admin/product-editor-schema";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";

export function InternalNotesSection({ register }: { register: UseFormRegister<ProductEditorValues> }) {
  const allowed = useDashboardAuth((s) => s.hasRole("admin"));
  if (!allowed) {
    return (
      <AdminProductFormSection title="ملاحظات داخلية">
        <p>هذا القسم متاح لمدير الكتالوج فما فوق.</p>
      </AdminProductFormSection>
    );
  }
  return (
    <AdminProductFormSection title="ملاحظات داخلية">
      <label>
        ملاحظات
        <textarea {...register("internalNotes")} rows={4} style={{ width: "100%" }} dir="rtl" />
      </label>
      <label>
        المورد
        <input {...register("sourceSupplier")} style={{ width: "100%" }} dir="rtl" />
      </label>
      <label>
        مرجع فاتورة الشراء
        <input {...register("purchaseInvoiceRef")} style={{ width: "100%" }} dir="rtl" />
      </label>
    </AdminProductFormSection>
  );
}
