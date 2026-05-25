"use client";

import { Controller, type Control, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import { RichTextEditor } from "@/components/admin/products/editor/RichTextEditor";
import type { ProductEditorValues } from "@/lib/admin/product-editor-schema";

export function DescriptionSection({
  register,
  control,
  watch,
  setValue,
}: {
  register: UseFormRegister<ProductEditorValues>;
  control: Control<ProductEditorValues>;
  watch: UseFormWatch<ProductEditorValues>;
  setValue: UseFormSetValue<ProductEditorValues>;
}) {
  const keyFeatures = watch("keyFeatures") ?? [];
  const whatsInBox = watch("whatsInBox") ?? [];

  return (
    <AdminProductFormSection title="الوصف" subtitle="وصف قصير، وصف كامل، المميزات، محتوى العلبة">
      <label>
        وصف قصير (عربي) — {watch("shortDescAr").length}/200
        <textarea {...register("shortDescAr")} maxLength={200} rows={2} style={{ width: "100%" }} dir="rtl" />
      </label>
      <label>
        وصف قصير (إنجليزي)
        <textarea {...register("shortDescEn")} maxLength={200} rows={2} style={{ width: "100%" }} dir="ltr" />
      </label>
      <Controller
        name="descAr"
        control={control}
        render={({ field }) => <RichTextEditor label="الوصف الكامل (عربي)" value={field.value} onChange={field.onChange} dir="rtl" />}
      />
      <Controller
        name="descEn"
        control={control}
        render={({ field }) => <RichTextEditor label="الوصف الكامل (إنجليزي)" value={field.value} onChange={field.onChange} dir="ltr" />}
      />
      <div>
        <strong>المميزات الرئيسية</strong>
        {keyFeatures.map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              value={keyFeatures[i]}
              onChange={(e) => {
                const next = [...keyFeatures];
                next[i] = e.target.value;
                setValue("keyFeatures", next, { shouldDirty: true });
              }}
              style={{ flex: 1 }}
              dir="rtl"
            />
            <button
              type="button"
              onClick={() => setValue("keyFeatures", keyFeatures.filter((_, j) => j !== i), { shouldDirty: true })}
            >
              حذف
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setValue("keyFeatures", [...keyFeatures, ""], { shouldDirty: true })}>
          + ميزة
        </button>
      </div>
      <div>
        <strong>ماذا في الصندوق</strong>
        {whatsInBox.map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              value={whatsInBox[i]}
              onChange={(e) => {
                const next = [...whatsInBox];
                next[i] = e.target.value;
                setValue("whatsInBox", next, { shouldDirty: true });
              }}
              style={{ flex: 1 }}
              dir="rtl"
            />
            <button
              type="button"
              onClick={() => setValue("whatsInBox", whatsInBox.filter((_, j) => j !== i), { shouldDirty: true })}
            >
              حذف
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setValue("whatsInBox", [...whatsInBox, ""], { shouldDirty: true })}>
          + عنصر
        </button>
      </div>
    </AdminProductFormSection>
  );
}
