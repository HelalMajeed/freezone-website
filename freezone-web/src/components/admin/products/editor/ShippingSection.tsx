"use client";

import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import type { ProductEditorValues } from "@/lib/admin/product-editor-schema";

const IRAQ_PROVINCES = [
  "بغداد",
  "البصرة",
  "نينوى",
  "أربيل",
  "السليمانية",
  "دهوك",
  "كركوك",
  "الأنبار",
  "ديالى",
  "بابل",
  "كربلاء",
  "النجف",
  "واسط",
  "ميسان",
  "ذي قار",
  "القادسية",
  "المثنى",
  "صلاح الدين",
];

export function ShippingSection({
  register,
  watch,
  setValue,
}: {
  register: UseFormRegister<ProductEditorValues>;
  watch: UseFormWatch<ProductEditorValues>;
  setValue: UseFormSetValue<ProductEditorValues>;
}) {
  const excluded = watch("excludedProvinces") ?? [];

  return (
    <AdminProductFormSection title="الشحن">
      <label>
        الوزن (كغ)
        <input type="number" step="0.01" {...register("weightKg", { valueAsNumber: true })} style={{ width: "100%" }} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <label>
          الطول (سم)
          <input type="number" {...register("dimLengthCm", { valueAsNumber: true })} />
        </label>
        <label>
          العرض
          <input type="number" {...register("dimWidthCm", { valueAsNumber: true })} />
        </label>
        <label>
          الارتفاع
          <input type="number" {...register("dimHeightCm", { valueAsNumber: true })} />
        </label>
      </div>
      <label>
        <input type="checkbox" {...register("requiresSpecialHandling")} /> يتطلب شحن خاص
      </label>
      <div>
        محافظات مستثناة من الشحن
        {IRAQ_PROVINCES.map((p) => (
          <label key={p} style={{ display: "block", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={excluded.includes(p)}
              onChange={(e) => {
                const next = e.target.checked ? [...excluded, p] : excluded.filter((x) => x !== p);
                setValue("excludedProvinces", next, { shouldDirty: true });
              }}
            />{" "}
            {p}
          </label>
        ))}
      </div>
    </AdminProductFormSection>
  );
}
