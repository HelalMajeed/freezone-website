"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { uploadAdminImage, uploadAdminModel3d } from "@/lib/admin-upload-image";
import { MediaPickerModal, type MediaRow } from "@/components/admin/MediaPickerModal";
import { parseFacetAttributesFromUnknown } from "@/lib/facet-attributes";
import { AdminProductSpecFields } from "@/components/admin/products/AdminProductSpecFields";
import { freezoneApiUrl } from "@/lib/api-internal";

type Category = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr?: string;
  facetKeys?: unknown;
  facetAttributes?: import("@/lib/data").FacetAttributeDef[];
};
type BrandOpt = { id: number; nameEn: string; nameAr: string };

const field: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  background: "var(--admin-surface-muted)",
  color: "var(--admin-text)",
  border: "1px solid var(--admin-border)",
};

type Props = {
  categories: Category[];
  brands: BrandOpt[];
  /** Pre-select category when opening from catalog (e.g. `?cat=3`). */
  initialCategoryId?: number | null;
  onSuccess?: () => void;
};

export function AdminProductCreateForm({ categories, brands, initialCategoryId, onSuccess }: Props) {
  const [categoryId, setCategoryId] = useState<number>(0);
  const [brandId, setBrandId] = useState<number | "">("");
  const [brand, setBrand] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [storage, setStorage] = useState("");
  const [model3dFile, setModel3dFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fromLibraryUrls, setFromLibraryUrls] = useState<string[]>([]);
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [model, setModel] = useState("");
  const [secondaryCategoryIds, setSecondaryCategoryIds] = useState<number[]>([]);

  useEffect(() => {
    if (categories.length === 0) return;
    if (initialCategoryId != null && categories.some((c) => c.id === initialCategoryId)) {
      setCategoryId(initialCategoryId);
      return;
    }
    setCategoryId(categories[0].id);
  }, [categories, initialCategoryId]);

  const resolvedCategoryId = useMemo(() => {
    if (categories.length === 0) return 0;
    if (categories.some((c) => c.id === categoryId)) return categoryId;
    return categories[0].id;
  }, [categories, categoryId]);

  useEffect(() => {
    setSecondaryCategoryIds((prev) => prev.filter((id) => id !== resolvedCategoryId));
  }, [resolvedCategoryId]);

  const categoryAttributes = useMemo(() => {
    const c = categories.find((x) => x.id === resolvedCategoryId);
    return parseFacetAttributesFromUnknown(c?.facetAttributes ?? c?.facetKeys);
  }, [categories, resolvedCategoryId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setMsgIsError(false);
    setSubmitting(true);
    const imageUrls: string[] = [];
    let model3dUrl: string | null = null;
    try {
      for (const file of imageFiles) {
        imageUrls.push(await uploadAdminImage(file));
      }
      imageUrls.push(...fromLibraryUrls);
      if (model3dFile) {
        model3dUrl = await uploadAdminModel3d(model3dFile);
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "فشل رفع الملفات");
      setMsgIsError(true);
      setSubmitting(false);
      return;
    }
    const res = await fetch(freezoneApiUrl("/api/admin/products"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: resolvedCategoryId,
        brand,
        brandId: brandId === "" ? null : brandId,
        nameEn,
        nameAr: nameAr || nameEn,
        descEn,
        descAr: descAr || descEn,
        price: parseInt(price.replace(/\D/g, ""), 10) || 0,
        oldPrice: oldPrice ? parseInt(oldPrice.replace(/\D/g, ""), 10) : null,
        storage,
        model: model.trim(),
        model3d: model3dUrl,
        images: imageUrls,
        specs: categoryAttributes.length ? specs : undefined,
        secondaryCategoryIds: secondaryCategoryIds.length ? secondaryCategoryIds : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setMsgIsError(true);
      if (res.status === 503) {
        setMsg("لا يمكن إضافة منتج بدون قاعدة بيانات — أضف DATABASE_URL ثم npx prisma db push و npx prisma db seed.");
        return;
      }
      try {
        const j = (await res.json()) as { error?: string; hint?: string; missing?: string[]; code?: string };
        setMsg(j.hint || j.error || "فشل الإنشاء");
      } catch {
        setMsg("فشل الإنشاء");
      }
      return;
    }
    setMsg("تمت إضافة المنتج");
    setMsgIsError(false);
    setNameEn("");
    setNameAr("");
    setDescEn("");
    setDescAr("");
    setPrice("");
    setOldPrice("");
    setImageFiles([]);
    setModel3dFile(null);
    setFromLibraryUrls([]);
    setSecondaryCategoryIds([]);
    onSuccess?.();
  }

  function onBrandPick(id: number | "") {
    setBrandId(id);
    if (id === "") return;
    const b = brands.find((x) => x.id === id);
    if (b) setBrand(b.nameEn || b.nameAr);
  }

  if (categories.length === 0) {
    return <p style={{ color: "var(--admin-muted)" }}>لا توجد أقسام بعد — أضف قسماً أولاً من «الأقسام».</p>;
  }

  return (
    <form onSubmit={(e) => void submit(e)} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}>
      <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>القسم الرئيسي</label>
      <select
        value={resolvedCategoryId}
        onChange={(e) => {
          setCategoryId(Number(e.target.value));
          setSpecs({});
        }}
        style={{
          padding: 10,
          borderRadius: 8,
          background: "var(--admin-surface-inset)",
          color: "var(--admin-text)",
          border: "1px solid var(--admin-border)",
        }}
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nameEn} ({c.slug})
          </option>
        ))}
      </select>
      <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>أقسام إضافية (اختياري)</label>
      <div
        style={{
          ...field,
          maxHeight: 200,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {categories
          .filter((c) => c.id !== resolvedCategoryId)
          .map((c) => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={secondaryCategoryIds.includes(c.id)}
                onChange={() => {
                  setSecondaryCategoryIds((prev) =>
                    prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                  );
                }}
              />
              <span>
                {c.nameEn} ({c.slug})
              </span>
            </label>
          ))}
      </div>
      <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>العلامة التجارية (من الجدول)</label>
      <select
        value={brandId === "" ? "" : String(brandId)}
        onChange={(e) => onBrandPick(e.target.value === "" ? "" : Number(e.target.value))}
        style={field}
      >
        <option value="">— اختر علامة أو اترك فارغاً —</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.nameAr} ({b.nameEn})
          </option>
        ))}
      </select>
      <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>نص العلامة الاحتياطي (يُخزَّن في حقل brand)</label>
      <input placeholder="مثل MSI إن لم تُربط علامة" value={brand} onChange={(e) => setBrand(e.target.value)} style={field} />
      <input placeholder="الاسم EN *" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required style={field} />
      <input placeholder="الاسم AR" value={nameAr} onChange={(e) => setNameAr(e.target.value)} style={field} />
      <textarea placeholder="وصف EN" value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={2} style={field} />
      <textarea placeholder="وصف AR" value={descAr} onChange={(e) => setDescAr(e.target.value)} rows={2} style={field} />
      <input placeholder="السعر (IQD)" value={price} onChange={(e) => setPrice(e.target.value)} required style={field} />
      <input placeholder="سعر قبل الخصم (اختياري)" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} style={field} />
      <input placeholder="مواصفات مختصرة (سطر واحد للعرض)" value={storage} onChange={(e) => setStorage(e.target.value)} style={field} />
      <input placeholder="الموديل (مثل ROG Strix G16)" value={model} onChange={(e) => setModel(e.target.value)} style={field} />
      <AdminProductSpecFields
        attributes={categoryAttributes}
        specs={specs}
        onChange={(key, value) => setSpecs((prev) => ({ ...prev, [key]: value }))}
        fieldStyle={field}
      />
      <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>نموذج ثلاثي الأبعاد (اختياري — ملف .glb أو .gltf)</label>
      <input
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setModel3dFile(f);
          e.target.value = "";
        }}
        style={{ fontSize: 13, color: "var(--admin-text)" }}
      />
      {model3dFile && <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>نموذج: {model3dFile.name}</p>}
      <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>صور المنتج — عدة صور (PNG أو JPEG)</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            setImageFiles((prev) => [...prev, ...picked]);
            e.target.value = "";
          }}
          style={{ fontSize: 13, color: "var(--admin-text)" }}
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--admin-border)",
            background: "var(--admin-surface-inset)",
            color: "var(--admin-text)",
          }}
        >
          إضافة صور من المكتبة
        </button>
      </div>
      {fromLibraryUrls.length > 0 && (
        <p style={{ fontSize: 12, color: "#86efac", margin: 0 }}>
          من المكتبة: {fromLibraryUrls.length} رابط — يُرفَق مع المرفوعات عند الإرسال
        </p>
      )}
      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multi
        onSelect={(rows: MediaRow[]) => {
          setFromLibraryUrls((prev) => [...prev, ...rows.filter((r) => r.kind === "image").map((r) => r.url)]);
        }}
      />
      {imageFiles.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--admin-muted)", margin: 0 }}>
          <p style={{ margin: "0 0 6px 0" }}>
            <strong>{imageFiles.length}</strong> صورة — ستُرفَع جميعاً عند «إضافة المنتج»
          </p>
          <ul style={{ margin: 0, paddingInlineStart: 18, maxHeight: 120, overflow: "auto" }}>
            {imageFiles.map((f, i) => (
              <li key={`${f.name}-${i}-${f.size}`}>
                {f.name}
                <button
                  type="button"
                  onClick={() => setImageFiles((prev) => prev.filter((_, j) => j !== i))}
                  style={{
                    marginInlineStart: 8,
                    padding: "0 6px",
                    fontSize: 11,
                    cursor: "pointer",
                    background: "var(--admin-border)",
                    border: "none",
                    color: "var(--admin-text)",
                    borderRadius: 4,
                  }}
                >
                  حذف
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "12px 20px",
          borderRadius: 8,
          border: "none",
          background: submitting ? "#050d18" : "#0b1f3b",
          color: "#fff",
          fontWeight: 700,
          cursor: submitting ? "wait" : "pointer",
          alignSelf: "flex-start",
        }}
      >
        {submitting ? "جاري الرفع…" : "إضافة المنتج"}
      </button>
      {msg ? <p style={{ color: msgIsError ? "#fecaca" : "#86efac", margin: 0 }}>{msg}</p> : null}
    </form>
  );
}
