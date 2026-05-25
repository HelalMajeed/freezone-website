"use client";

import type { UseFormRegister } from "react-hook-form";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import type { ProductEditorValues } from "@/lib/admin/product-editor-schema";

export function InventorySection({ register }: { register: UseFormRegister<ProductEditorValues> }) {
  return (
    <AdminProductFormSection title="المخزون والتوفر">
      <label>
        الكمية
        <input type="number" {...register("quantity", { valueAsNumber: true })} style={{ width: "100%" }} />
      </label>
      <label>
        حد التنبيه منخفض المخزون
        <input type="number" {...register("lowStockThreshold", { valueAsNumber: true })} style={{ width: "100%" }} />
      </label>
      <label>
        التوفر
        <select {...register("availability")} style={{ width: "100%" }}>
          <option value="IN_STOCK">متوفر</option>
          <option value="OUT_OF_STOCK">غير متوفر</option>
          <option value="COMING_SOON">قريباً</option>
          <option value="ON_DEMAND">حسب الطلب</option>
        </select>
      </label>
      <label>
        وقت التجهيز (أيام)
        <input type="number" {...register("prepTimeDays", { valueAsNumber: true })} style={{ width: "100%" }} />
      </label>
    </AdminProductFormSection>
  );
}
