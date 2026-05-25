"use client";

import { useEffect, useState } from "react";
import type { Control, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import type { ProductEditorValues } from "@/lib/admin/product-editor-schema";
import { checkFieldUnique } from "@/lib/admin/product-editor-api";
import { findArabicTypoHints } from "@/lib/arabic-typo-hints";

type Cat = { id: number; nameAr: string; nameEn: string; slug: string };
type Brand = { id: number; nameAr: string; nameEn: string };

function slugifyEn(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

export function BasicInfoSection({
  register,
  watch,
  setValue,
  categories,
  brands,
  productId,
}: {
  register: UseFormRegister<ProductEditorValues>;
  watch: UseFormWatch<ProductEditorValues>;
  setValue: UseFormSetValue<ProductEditorValues>;
  control: Control<ProductEditorValues>;
  categories: Cat[];
  brands: Brand[];
  productId: number;
}) {
  const nameAr = watch("nameAr");
  const nameEn = watch("nameEn");
  const slug = watch("slug");
  const nameArHints = findArabicTypoHints(nameAr ?? "");
  const sku = watch("sku");
  const [slugOk, setSlugOk] = useState<boolean | null>(null);
  const [skuOk, setSkuOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!nameEn || slug) return;
    setValue("slug", slugifyEn(nameEn), { shouldDirty: true });
  }, [nameEn, slug, setValue]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!slug) {
        setSlugOk(null);
        return;
      }
      void checkFieldUnique("slug", slug, productId).then(setSlugOk);
    }, 400);
    return () => window.clearTimeout(t);
  }, [slug, productId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!sku) {
        setSkuOk(null);
        return;
      }
      void checkFieldUnique("sku", sku, productId).then(setSkuOk);
    }, 400);
    return () => window.clearTimeout(t);
  }, [sku, productId]);

  const status = watch("catalogStatus");

  return (
    <AdminProductFormSection title="المعلومات الأساسية" subtitle="الاسم، الرابط، SKU، القسم، الحالة">
      <label>
        الاسم (عربي) *
        <input {...register("nameAr")} style={{ width: "100%" }} dir="rtl" />
        {nameArHints.map((h) => (
          <span key={h} style={{ display: "block", color: "#fbbf24", fontSize: 12, marginTop: 4 }}>
            {h}
          </span>
        ))}
      </label>
      <label>
        الاسم (إنجليزي) *
        <input {...register("nameEn")} style={{ width: "100%" }} dir="ltr" />
      </label>
      <label>
        الرابط (slug)
        <input {...register("slug")} style={{ width: "100%" }} dir="ltr" />
        {slugOk === false ? <span style={{ color: "#f87171" }}>هذا الرابط مستخدم</span> : null}
        {slugOk === true && slug ? <span style={{ color: "#4ade80" }}>الرابط متاح</span> : null}
      </label>
      <label>
        SKU
        <input {...register("sku")} style={{ width: "100%" }} dir="ltr" />
        {skuOk === false ? <span style={{ color: "#f87171" }}>رمز SKU مستخدم</span> : null}
      </label>
      <label>
        القسم الرئيسي *
        <select {...register("categoryId", { valueAsNumber: true })} style={{ width: "100%" }}>
          <option value={0}>— اختر —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameAr}
            </option>
          ))}
        </select>
      </label>
      <label>
        حالة سير العمل
        <select {...register("catalogStatus")} value={status} style={{ width: "100%" }}>
          <option value="DRAFT">مسودة</option>
          <option value="PENDING_REVIEW">قيد المراجعة</option>
          <option value="CHANGES_REQUESTED">يحتاج تعديل</option>
          <option value="PUBLISHED">منشور</option>
          <option value="ARCHIVED">مؤرشف</option>
        </select>
      </label>
      <label>
        العلامة التجارية
        <select
          {...register("brandId", {
            setValueAs: (v) => (v === "" || v === "0" ? null : Number(v)),
          })}
          style={{ width: "100%" }}
        >
          <option value="">—</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nameAr}
            </option>
          ))}
        </select>
      </label>
    </AdminProductFormSection>
  );
}
