import type { ProductEditorValues } from "@/lib/admin/product-editor-schema";

export type ReadinessItem = { id: string; label: string; ok: boolean; weight: number };

export function computeProductReadiness(
  values: ProductEditorValues,
  imageCount: number,
  requiredAttrCount: number,
  filledAttrCount: number,
): { score: number; items: ReadinessItem[] } {
  const descLen = (values.descAr?.length ?? 0) + (values.descEn?.length ?? 0);
  const items: ReadinessItem[] = [
    { id: "name", label: "اسم AR + EN", ok: Boolean(values.nameAr?.trim() && values.nameEn?.trim()), weight: 15 },
    { id: "images", label: "3 صور على الأقل", ok: imageCount >= 3, weight: 20 },
    { id: "desc", label: "وصف 100+ حرف", ok: descLen >= 100, weight: 15 },
    { id: "price", label: "السعر محدد", ok: values.price > 0, weight: 15 },
    {
      id: "attrs",
      label: `سمات الفئة (${filledAttrCount}/${requiredAttrCount})`,
      ok: requiredAttrCount === 0 || filledAttrCount >= requiredAttrCount,
      weight: 20,
    },
    {
      id: "seo",
      label: "SEO (عنوان + وصف)",
      ok: Boolean(values.metaTitleAr?.trim() && values.metaDescAr?.trim()),
      weight: 15,
    },
  ];
  const totalW = items.reduce((s, i) => s + i.weight, 0);
  const got = items.filter((i) => i.ok).reduce((s, i) => s + i.weight, 0);
  return { score: Math.round((got / totalW) * 100), items };
}
