"use client";

import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import type { ProductEditorValues } from "@/lib/admin/product-editor-schema";

export function SEOSection({
  register,
  watch,
  setValue,
}: {
  register: UseFormRegister<ProductEditorValues>;
  watch: UseFormWatch<ProductEditorValues>;
  setValue: UseFormSetValue<ProductEditorValues>;
}) {
  const keywords = watch("seoKeywords") ?? [];
  const nameEn = watch("nameEn");
  const shortEn = watch("shortDescEn");
  const slug = watch("slug");

  return (
    <AdminProductFormSection title="تحسين محركات البحث">
      <button
        type="button"
        onClick={() => {
          if (!watch("metaTitleEn")) setValue("metaTitleEn", nameEn.slice(0, 60), { shouldDirty: true });
          if (!watch("metaDescEn")) setValue("metaDescEn", shortEn.slice(0, 160), { shouldDirty: true });
        }}
      >
        اقتراح من الاسم والوصف القصير
      </button>
      <label>
        عنوان SEO (عربي) — {(watch("metaTitleAr") ?? "").length}/60
        <input {...register("metaTitleAr")} maxLength={60} style={{ width: "100%" }} dir="rtl" />
      </label>
      <label>
        عنوان SEO (إنجليزي)
        <input {...register("metaTitleEn")} maxLength={60} style={{ width: "100%" }} dir="ltr" />
      </label>
      <label>
        وصف SEO (عربي) — {(watch("metaDescAr") ?? "").length}/160
        <textarea {...register("metaDescAr")} maxLength={160} rows={2} style={{ width: "100%" }} dir="rtl" />
      </label>
      <label>
        وصف SEO (إنجليزي)
        <textarea {...register("metaDescEn")} maxLength={160} rows={2} style={{ width: "100%" }} dir="ltr" />
      </label>
      <p>معاينة الرابط: /products/{slug || "—"}</p>
      <div>
        كلمات مفتاحية
        {keywords.map((kw, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              value={kw}
              onChange={(e) => {
                const n = [...keywords];
                n[i] = e.target.value;
                setValue("seoKeywords", n, { shouldDirty: true });
              }}
            />
            <button type="button" onClick={() => setValue("seoKeywords", keywords.filter((_, j) => j !== i), { shouldDirty: true })}>
              حذف
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setValue("seoKeywords", [...keywords, ""], { shouldDirty: true })}>
          + كلمة
        </button>
      </div>
    </AdminProductFormSection>
  );
}
