"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadAdminImage, uploadAdminModel3d } from "@/lib/admin-upload-image";
import { importAdminImageFromUrl } from "@/lib/admin-import-image";
import { MediaPickerModal, type MediaRow } from "@/components/admin/MediaPickerModal";
import { AdminProductSpecFields } from "@/components/admin/products/AdminProductSpecFields";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import {
  AdminProductEditorTabs,
  type ProductEditorTab,
} from "@/components/admin/products/AdminProductEditorTabs";
import { AdminProductPreviewPanel } from "@/components/admin/products/AdminProductPreviewPanel";
import { buildSpecsPayloadForSave } from "@/lib/admin-product-specs-payload";
import { validateAdminProductSpecs } from "@/lib/admin/admin-product-spec-validation";
import { useCategoryAttributeSchema } from "@/lib/admin/use-category-attribute-schema";
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
  initialCategoryId?: number | null;
};

export function AdminProductCreateForm({ categories, brands, initialCategoryId }: Props) {
  const navigate = useNavigate();
  const [editorTab, setEditorTab] = useState<ProductEditorTab>("basic");
  const [categoryId, setCategoryId] = useState<number>(0);
  const [brandId, setBrandId] = useState<number | "">("");
  const [brand, setBrand] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [storage, setStorage] = useState("");
  const [model, setModel] = useState("");
  const [model3dFile, setModel3dFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fromLibraryUrls, setFromLibraryUrls] = useState<string[]>([]);
  const [importedLocalUrls, setImportedLocalUrls] = useState<string[]>([]);
  const [importUrlDraft, setImportUrlDraft] = useState("");
  const [importingUrl, setImportingUrl] = useState(false);
  const [displaySpecs, setDisplaySpecs] = useState<Record<string, string>>({});
  const [filterSpecs, setFilterSpecs] = useState<Record<string, string>>({});
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

  const {
    attributes: categoryAttributes,
    loading: schemaLoading,
    error: schemaError,
    reload: reloadSchema,
  } = useCategoryAttributeSchema(resolvedCategoryId, categories);

  useEffect(() => {
    if (!categoryAttributes.length) return;
    setDisplaySpecs((prev) => {
      const next: Record<string, string> = {};
      for (const a of categoryAttributes) next[a.key] = prev[a.key] ?? "";
      return next;
    });
    setFilterSpecs((prev) => {
      const next: Record<string, string> = {};
      for (const a of categoryAttributes) next[a.key] = prev[a.key] ?? "";
      return next;
    });
  }, [categoryAttributes.map((a) => a.key).join("|")]);

  function parseExternalImageUrls(text: string): string[] {
    const parts = text
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const out: string[] = [];
    for (const p of parts) {
      try {
        const u = new URL(p);
        if (u.protocol === "http:" || u.protocol === "https:") out.push(u.href);
      } catch {
        /* skip */
      }
    }
    return [...new Set(out)];
  }

  async function importImageFromUrlDraft() {
    const urls = parseExternalImageUrls(importUrlDraft);
    if (!urls.length) {
      setMsg("أدخل رابطًا يبدأ بـ https:// يشير مباشرة إلى صورة.");
      setMsgIsError(true);
      return;
    }
    setMsg("");
    setMsgIsError(false);
    setImportingUrl(true);
    try {
      for (const source of urls) {
        const img = await importAdminImageFromUrl(source);
        setImportedLocalUrls((prev) => [...prev, img.url]);
      }
      setImportUrlDraft("");
      setMsg(`تم تنزيل وحفظ ${urls.length} صورة داخل الموقع`);
      setMsgIsError(false);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "تعذّر تنزيل الصورة. تأكد أن الرابط مباشر لصورة.");
      setMsgIsError(true);
    } finally {
      setImportingUrl(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setMsgIsError(false);
    const specErr = validateAdminProductSpecs(categoryAttributes, displaySpecs, filterSpecs);
    if (specErr) {
      setMsg(specErr);
      setMsgIsError(true);
      return;
    }
    setSubmitting(true);
    const imageUrls: string[] = [];
    let model3dUrl: string | null = null;
    try {
      for (const file of imageFiles) {
        imageUrls.push(await uploadAdminImage(file));
      }
      imageUrls.push(...fromLibraryUrls);
      imageUrls.push(...importedLocalUrls);
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
        sku: sku.trim(),
        quantity: parseInt(quantity, 10) || 0,
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
        specs: categoryAttributes.length
          ? buildSpecsPayloadForSave(categoryAttributes, displaySpecs, filterSpecs)
          : undefined,
        secondaryCategoryIds: secondaryCategoryIds.length ? secondaryCategoryIds : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setMsgIsError(true);
      try {
        const j = (await res.json()) as { error?: string };
        setMsg(j.error || "فشل الإنشاء");
      } catch {
        setMsg("فشل الإنشاء");
      }
      return;
    }
    const j = (await res.json()) as { id?: number };
    if (j.id) {
      navigate(`/admin/products/edit/${j.id}`);
      return;
    }
    navigate("/admin/products");
  }

  function onBrandPick(id: number | "") {
    setBrandId(id);
    if (id === "") return;
    const b = brands.find((x) => x.id === id);
    if (b) setBrand(b.nameEn || b.nameAr);
  }

  if (categories.length === 0) {
    return <p style={{ color: "var(--admin-muted)" }}>لا توجد أقسام — أضف قسماً من «الأقسام».</p>;
  }

  return (
    <form onSubmit={(e) => void submit(e)} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 920 }}>
      <AdminProductEditorTabs active={editorTab} onChange={setEditorTab} />

      {(editorTab === "basic" || editorTab === "pricing") && (
        <AdminProductFormSection
          title={editorTab === "pricing" ? "Pricing & Stock" : "Basic Info"}
          subtitle={
            editorTab === "pricing"
              ? "السعر، SKU، المخزون"
              : "الاسم، القسم، العلامة، الوصف"
          }
        >
          {editorTab === "basic" ? (
            <>
              <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>القسم الرئيسي</label>
              <select
                value={resolvedCategoryId}
                onChange={(e) => {
                  setCategoryId(Number(e.target.value));
                  setDisplaySpecs({});
                  setFilterSpecs({});
                }}
                style={field}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn} ({c.slug})
                  </option>
                ))}
              </select>
              <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>أقسام إضافية</label>
              <div style={{ ...field, maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {categories
                  .filter((c) => c.id !== resolvedCategoryId)
                  .map((c) => (
                    <label key={c.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={secondaryCategoryIds.includes(c.id)}
                        onChange={() =>
                          setSecondaryCategoryIds((prev) =>
                            prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                          )
                        }
                      />
                      {c.nameEn}
                    </label>
                  ))}
              </div>
              <select value={brandId === "" ? "" : String(brandId)} onChange={(e) => onBrandPick(e.target.value === "" ? "" : Number(e.target.value))} style={field}>
                <option value="">— علامة —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr} ({b.nameEn})
                  </option>
                ))}
              </select>
              <input placeholder="نص العلامة" value={brand} onChange={(e) => setBrand(e.target.value)} style={field} />
              <input placeholder="الاسم EN *" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required style={field} />
              <input placeholder="الاسم AR" value={nameAr} onChange={(e) => setNameAr(e.target.value)} style={field} />
              <textarea placeholder="وصف EN" value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={2} style={field} />
              <textarea placeholder="وصف AR" value={descAr} onChange={(e) => setDescAr(e.target.value)} rows={2} style={field} />
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input placeholder="السعر IQD *" value={price} onChange={(e) => setPrice(e.target.value)} required style={field} />
                <input placeholder="سعر قبل الخصم" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} style={field} />
              </div>
              <input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} style={field} />
              <input type="number" placeholder="الكمية" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={field} />
              <input placeholder="الموديل" value={model} onChange={(e) => setModel(e.target.value)} style={field} />
              <input placeholder="سطر البطاقة (legacy)" value={storage} onChange={(e) => setStorage(e.target.value)} style={field} />
            </>
          )}
        </AdminProductFormSection>
      )}

      {editorTab === "filters" ? (
        <AdminProductSpecFields
          section="filter"
          attributes={categoryAttributes}
          displaySpecs={displaySpecs}
          filterSpecs={filterSpecs}
          loading={schemaLoading}
          error={schemaError}
          categoryId={resolvedCategoryId}
          onRetry={() => reloadSchema()}
          onChangeDisplay={(key, value) => setDisplaySpecs((p) => ({ ...p, [key]: value }))}
          onChangeFilter={(key, value) => setFilterSpecs((p) => ({ ...p, [key]: value }))}
          fieldStyle={field}
        />
      ) : null}

      {editorTab === "display" ? (
        <AdminProductSpecFields
          section="display"
          attributes={categoryAttributes}
          displaySpecs={displaySpecs}
          filterSpecs={filterSpecs}
          loading={schemaLoading}
          error={schemaError}
          categoryId={resolvedCategoryId}
          onRetry={() => reloadSchema()}
          onChangeDisplay={(key, value) => setDisplaySpecs((p) => ({ ...p, [key]: value }))}
          onChangeFilter={(key, value) => setFilterSpecs((p) => ({ ...p, [key]: value }))}
          fieldStyle={field}
        />
      ) : null}

      {editorTab === "preview" ? (
        <AdminProductPreviewPanel
          displaySpecs={displaySpecs}
          filterSpecs={filterSpecs}
          attributes={categoryAttributes}
        />
      ) : null}

      {editorTab === "images" ? (
        <AdminProductFormSection title="الصور" subtitle="صور المنتج ونموذج 3D">
          <input type="file" accept=".glb,.gltf" onChange={(e) => setModel3dFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg"
            onChange={(e) => {
              setImageFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
              e.target.value = "";
            }}
            style={{ fontSize: 13 }}
          />
          <button type="button" onClick={() => setPickerOpen(true)} style={field}>
            من المكتبة
          </button>
          <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: "12px 0 8px" }}>
            استيراد صورة من رابط — يتم تنزيل الصورة وحفظها على الخادم قبل إنشاء المنتج.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "stretch" }}>
            <input
              dir="ltr"
              type="url"
              inputMode="url"
              placeholder="https://example.com/image.jpg"
              value={importUrlDraft}
              onChange={(e) => setImportUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void importImageFromUrlDraft();
                }
              }}
              style={{ ...field, flex: "1 1 260px", minWidth: 200 }}
            />
            <button
              type="button"
              disabled={importingUrl || !importUrlDraft.trim()}
              onClick={() => void importImageFromUrlDraft()}
              style={{
                ...field,
                cursor: importingUrl || !importUrlDraft.trim() ? "wait" : "pointer",
                fontWeight: 600,
              }}
            >
              {importingUrl ? "جاري تنزيل الصورة…" : "تنزيل وحفظ الصورة"}
            </button>
          </div>
          {importedLocalUrls.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexWrap: "wrap", gap: 10 }}>
              {importedLocalUrls.map((url) => (
                <li key={url} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <img src={url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "rgba(22,163,74,0.12)",
                      color: "#166534",
                    }}
                  >
                    محفوظ محليًا
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <MediaPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            multi
            onSelect={(rows: MediaRow[]) =>
              setFromLibraryUrls((prev) => [...prev, ...rows.filter((r) => r.kind === "image").map((r) => r.url)])
            }
          />
          <p style={{ fontSize: 12, color: "var(--admin-muted)", margin: 0 }}>
            {imageFiles.length + fromLibraryUrls.length + importedLocalUrls.length} صورة جاهزة للرفع
          </p>
        </AdminProductFormSection>
      ) : null}

      {editorTab !== "preview" ? (
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "12px 20px",
            borderRadius: 8,
            border: "none",
            background: submitting ? "#334155" : "#0b1f3b",
            color: "#fff",
            fontWeight: 700,
            cursor: submitting ? "wait" : "pointer",
            alignSelf: "flex-start",
          }}
        >
          {submitting ? "جاري الحفظ…" : "إنشاء المنتج"}
        </button>
      ) : null}

      {msg ? <p style={{ color: msgIsError ? "#fecaca" : "#86efac", margin: 0 }}>{msg}</p> : null}
    </form>
  );
}
