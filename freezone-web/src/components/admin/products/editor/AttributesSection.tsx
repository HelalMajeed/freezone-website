"use client";

import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import type { ProductEditorValues } from "@/lib/admin/product-editor-schema";
import { useCategoryAttributeSchema } from "@/lib/admin/use-category-attribute-schema";
import { AdminProductSpecFields } from "@/components/admin/products/AdminProductSpecFields";

export function AttributesSection({
  watch,
  setValue,
  categories,
}: {
  watch: UseFormWatch<ProductEditorValues>;
  setValue: UseFormSetValue<ProductEditorValues>;
  categories: Array<{ id: number; slug: string; nameEn: string; facetKeys?: unknown }>;
}) {
  const categoryId = watch("categoryId");
  const specs = watch("specs");
  const { attributes, loading, error } = useCategoryAttributeSchema(categoryId || null, categories);

  if (!categoryId) {
    return (
      <AdminProductFormSection title="سمات الفئة" badge="!">
        اختر القسم الرئيسي أولاً لعرض السمات.
      </AdminProductFormSection>
    );
  }

  if (!loading && !attributes.length) {
    return (
      <AdminProductFormSection title="سمات الفئة" badge="تحذير">
        <p style={{ color: "#fbbf24" }}>
          هذه الفئة لا تحتوي سمات معرّفة. اطلب من مدير الكتالوج إعداد السمات من صفحة الأقسام قبل إدخال
          المواصفات.
        </p>
      </AdminProductFormSection>
    );
  }

  return (
    <AdminProductFormSection title="سمات الفئة" subtitle="قيم EAV — تُحفظ في ProductAttributeValue">
      {error ? <p style={{ color: "#f87171" }}>{error}</p> : null}
      {loading ? <p>جارٍ تحميل السمات…</p> : null}
      <AdminProductSpecFields
        attributes={attributes}
        displaySpecs={specs}
        filterSpecs={{}}
        fieldStyle={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #334155" }}
        onChangeDisplay={(key, value) =>
          setValue("specs", { ...specs, [key]: value }, { shouldDirty: true })
        }
        onChangeFilter={() => undefined}
        loading={loading}
        error={error}
        categoryId={categoryId}
      />
    </AdminProductFormSection>
  );
}
