"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate, useParams } from "react-router-dom";
import { uploadAdminImage, uploadAdminModel3d } from "@/lib/admin-upload-image";
import { importAdminImageFromUrl } from "@/lib/admin-import-image";
import { MediaPickerModal, type MediaRow } from "@/components/admin/MediaPickerModal";
import { normalizeSpecsInput } from "@/lib/spec-validation";
import { parseFacetAttributesFromUnknown } from "@/lib/facet-attributes";
import { buildSpecsPayloadForSave } from "@/lib/admin-product-specs-payload";
import { validateAdminProductSpecs } from "@/lib/admin/admin-product-spec-validation";
import { useCategoryAttributeSchema } from "@/lib/admin/use-category-attribute-schema";
import { AdminProductSpecFields } from "@/components/admin/products/AdminProductSpecFields";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import {
  AdminProductEditorTabs,
  type ProductEditorTab,
} from "@/components/admin/products/AdminProductEditorTabs";
import { AdminProductPreviewPanel } from "@/components/admin/products/AdminProductPreviewPanel";
import { AdminProductEditorHeader } from "@/components/admin/products/AdminProductEditorHeader";
import { AdminStickySaveBar } from "@/components/admin/ui/AdminStickySaveBar";
import {
  computeTabStatuses,
  deriveWorkflowStatus,
  stockWorkflowStatus,
} from "@/lib/admin/admin-product-tab-status";
import { freezoneApiUrl } from "@/lib/api-internal";

type Category = {
  id: number;
  slug: string;
  nameEn: string;
  facetKeys?: unknown;
  facetAttributes?: import("@/lib/data").FacetAttributeDef[];
};
type BrandOpt = { id: number; nameEn: string; nameAr: string };
type ImgRow = { id: number; url: string; sortOrder: number; originalSourceUrl?: string | null };

type ProductRow = {
  id: number;
  categoryId: number;
  /** Parsed from API `secondaryCategories`; not sent back as nested array. */
  secondaryCategoryIds: number[];
  brand: string;
  brandId: number | null;
  sku: string;
  model: string;
  quantity: number;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  price: number;
  oldPrice: number | null;
  storage: string;
  model3d: string | null;
  inStock: boolean;
  featured: boolean;
  isNew: boolean;
  icon: string;
  rating: number;
  reviews: number;
  sales: number;
  published: boolean;
  images: ImgRow[];
  category: { id: number; slug: string; nameEn: string };
  specs?: Record<string, unknown> | null;
  displaySpecs?: Record<string, unknown> | null;
  filterSpecs?: Record<string, unknown> | null;
};

type ApiProductPayload = Omit<ProductRow, "secondaryCategoryIds"> & {
  secondaryCategories?: { categoryId: number }[];
};

const field: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  background: "var(--admin-surface-muted)",
  color: "var(--admin-text)",
  border: "1px solid #334155",
};

export default function AdminEditProductPage() {
  const navigate = useNavigate();
  const params = useParams();
  const idParam = params?.id;
  const productId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replaceImageId, setReplaceImageId] = useState<number | null>(null);
  const [galleryUrlDraft, setGalleryUrlDraft] = useState("");
  const [addingGalleryUrls, setAddingGalleryUrls] = useState(false);
  const [editorTab, setEditorTab] = useState<ProductEditorTab>("basic");
  const [displaySpecs, setDisplaySpecs] = useState<Record<string, string>>({});
  const [filterSpecs, setFilterSpecs] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [publishIntent, setPublishIntent] = useState<boolean | null>(null);
  const {
    attributes: categoryAttributes,
    loading: schemaLoading,
    error: schemaError,
    reload: reloadSchema,
    setAttributes: setCategoryAttributes,
  } = useCategoryAttributeSchema(product?.categoryId, categories);

  const markDirty = useCallback(() => setDirty(true), []);

  const editorCtx = useMemo(() => {
    if (!product) return null;
    return {
      nameEn: product.nameEn,
      categoryId: product.categoryId,
      price: product.price,
      quantity: product.quantity,
      inStock: product.inStock,
      published: product.published,
      imageCount: product.images.length,
      displaySpecs,
      filterSpecs,
      attributes: categoryAttributes,
    };
  }, [product, displaySpecs, filterSpecs, categoryAttributes]);

  const tabStatuses = useMemo(() => (editorCtx ? computeTabStatuses(editorCtx) : undefined), [editorCtx]);
  const workflowStatus = useMemo(() => (editorCtx ? deriveWorkflowStatus(editorCtx) : "draft"), [editorCtx]);

  const publishChecklist = useMemo(() => {
    if (!product) return [];
    const st = tabStatuses;
    return [
      { id: "name", label: "اسم المنتج", ok: Boolean(product.nameEn.trim()) },
      { id: "cat", label: "القسم", ok: Boolean(product.categoryId) },
      { id: "price", label: "السعر", ok: product.price > 0 },
      { id: "img", label: "صورة رئيسية", ok: product.images.length > 0 },
      { id: "filters", label: "قيم الفلاتر", ok: st?.filters !== "error" && st?.filters !== "warn" },
      { id: "display", label: "مواصفات العرض", ok: st?.display !== "warn" },
    ];
  }, [product, tabStatuses]);

  const loadAll = useCallback(async () => {
    if (!Number.isFinite(productId)) {
      setErr("معرّف غير صالح");
      setLoading(false);
      return;
    }
    setErr("");
    const [c, b, p] = await Promise.all([
      fetch(freezoneApiUrl("/api/admin/categories"), { credentials: "include" }),
      fetch(freezoneApiUrl("/api/admin/brands"), { credentials: "include" }),
      fetch(freezoneApiUrl(`/api/admin/products/${productId}`), { credentials: "include" }),
    ]);
    if (c.status === 401 || b.status === 401 || p.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (p.status === 404) {
      setErr("المنتج غير موجود");
      setLoading(false);
      return;
    }
    let cats: Category[] = [];
    if (c.ok) {
      cats = (await c.json()) as Category[];
      setCategories(cats);
    }
    if (b.ok) setBrands(await b.json());
    if (p.ok) {
      const raw = (await p.json()) as ApiProductPayload;
      raw.images = [...raw.images].sort((a, b) => a.sortOrder - b.sortOrder);
      const secondaryCategoryIds =
        raw.secondaryCategories?.map((x) => x.categoryId).filter((n) => Number.isFinite(n)) ?? [];
      const { secondaryCategories, ...rest } = raw;
      void secondaryCategories;
      setProduct({ ...rest, secondaryCategoryIds, model: (raw as { model?: string }).model ?? "" });
      const apiAttrs = (raw as { categoryAttributes?: import("@/lib/data").FacetAttributeDef[] })
        .categoryAttributes;
      const cat = cats.find((x) => x.id === raw.categoryId);
      const attrs =
        apiAttrs?.length ? apiAttrs : parseFacetAttributesFromUnknown(cat?.facetKeys);
      const displayBase = normalizeSpecsInput(raw.displaySpecs ?? raw.specs);
      const filterBase = normalizeSpecsInput(raw.filterSpecs);
      const display: Record<string, string> = {};
      const filter: Record<string, string> = {};
      for (const a of attrs) {
        display[a.key] = displayBase[a.key] ?? "";
        filter[a.key] = filterBase[a.key] ?? "";
      }
      setDisplaySpecs(display);
      setFilterSpecs(filter);
      if (apiAttrs?.length) setCategoryAttributes(apiAttrs);
    } else {
      setErr(p.status === 503 ? "قاعدة البيانات غير متاحة" : "تعذّر تحميل المنتج");
    }
    setLoading(false);
  }, [productId, navigate, setCategoryAttributes]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!product || !Number.isFinite(productId)) return;
    const specErr = validateAdminProductSpecs(categoryAttributes, displaySpecs, filterSpecs);
    if (specErr) {
      setErr(specErr);
      return;
    }
    setSaving(true);
    setMsg("");
    setErr("");
    const res = await fetch(freezoneApiUrl(`/api/admin/products/${productId}`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: product.categoryId,
        brand: product.brand,
        brandId: product.brandId,
        sku: product.sku,
        quantity: product.quantity,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        descEn: product.descEn,
        descAr: product.descAr,
        price: product.price,
        oldPrice: product.oldPrice,
        storage: product.storage,
        model3d: product.model3d,
        inStock: product.inStock,
        featured: product.featured,
        isNew: product.isNew,
        icon: product.icon,
        rating: product.rating,
        reviews: product.reviews,
        sales: product.sales,
        published: publishIntent ?? product.published,
        model: product.model ?? "",
        specs: categoryAttributes.length
          ? buildSpecsPayloadForSave(categoryAttributes, displaySpecs, filterSpecs)
          : {},
        secondaryCategoryIds: product.secondaryCategoryIds,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      try {
        const j = (await res.json()) as { error?: string; missing?: string[]; code?: string };
        setErr(j.error || "فشل حفظ البيانات");
      } catch {
        setErr("فشل حفظ البيانات");
      }
      return;
    }
    setMsg("تم حفظ بيانات المنتج");
    setDirty(false);
    setPublishIntent(null);
    void loadAll();
  }

  function saveAsDraft() {
    setPublishIntent(false);
    const form = document.getElementById("admin-product-edit-form") as HTMLFormElement | null;
    form?.requestSubmit();
  }

  function publishProduct() {
    setPublishIntent(true);
    const form = document.getElementById("admin-product-edit-form") as HTMLFormElement | null;
    form?.requestSubmit();
  }

  async function reorder(ids: number[]) {
    const res = await fetch(freezoneApiUrl(`/api/admin/products/${productId}/images`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ids }),
    });
    if (!res.ok) {
      setErr("فشل ترتيب الصور");
      return;
    }
    void loadAll();
  }

  function moveImage(index: number, dir: -1 | 1) {
    if (!product?.images.length) return;
    const next = [...product.images];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    void reorder(next.map((x) => x.id));
  }

  async function deleteImage(imageId: number) {
    if (!confirm("حذف هذه الصورة؟")) return;
    const res = await fetch(freezoneApiUrl(`/api/admin/product-images/${imageId}`), { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      setErr("فشل حذف الصورة");
      return;
    }
    void loadAll();
  }

  async function appendImages(urls: string[]): Promise<boolean> {
    if (!urls.length) return false;
    const res = await fetch(freezoneApiUrl(`/api/admin/products/${productId}/images`), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) {
      setErr("فشل إضافة الصور");
      return false;
    }
    void loadAll();
    return true;
  }

  /** Accepts one URL per line or comma/semicolon-separated https links (external hosting). */
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

  async function importGalleryUrlFromInput() {
    const urls = parseExternalImageUrls(galleryUrlDraft);
    if (!urls.length) {
      setErr("أدخل رابطًا يبدأ بـ https:// أو http:// يشير مباشرة إلى صورة.");
      return;
    }
    setErr("");
    setAddingGalleryUrls(true);
    let saved = 0;
    try {
      for (const source of urls) {
        await importAdminImageFromUrl(source, { productId });
        saved++;
      }
      if (saved > 0) {
        setGalleryUrlDraft("");
        setMsg(`تم تنزيل وحفظ ${saved} صورة داخل الموقع`);
        void loadAll();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر تنزيل الصورة");
    } finally {
      setAddingGalleryUrls(false);
    }
  }

  async function onPickReplaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || replaceImageId == null) return;
    try {
      const url = await uploadAdminImage(file);
      const res = await fetch(freezoneApiUrl(`/api/admin/product-images/${replaceImageId}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("patch");
      setReplaceImageId(null);
      void loadAll();
    } catch {
      setErr("فشل استبدال الصورة");
    }
  }

  async function onModel3dFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !product) return;
    try {
      const url = await uploadAdminModel3d(file);
      setProduct({ ...product, model3d: url });
      const res = await fetch(freezoneApiUrl(`/api/admin/products/${productId}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model3d: url }),
      });
      if (!res.ok) throw new Error("patch");
      setMsg("تم تحديث نموذج 3D");
      void loadAll();
    } catch {
      setErr("فشل رفع النموذج");
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "var(--admin-muted)" }}>جاري التحميل…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: 24 }}>
        <Link to="/admin/products" style={{ color: "#0b1f3b" }}>
          ← المنتجات
        </Link>
        <p style={{ color: "#fecaca", marginTop: 16 }}>{err || "لا يمكن العرض"}</p>
      </div>
    );
  }

  const stockMode = stockWorkflowStatus(product.inStock, product.quantity);

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <AdminProductEditorHeader
        title={product.nameAr || product.nameEn || `منتج #${product.id}`}
        workflowStatus={workflowStatus}
        storefrontUrl={`/ar/product/${product.id}`}
        saving={saving}
        onSave={() => {
          const form = document.getElementById("admin-product-edit-form") as HTMLFormElement | null;
          form?.requestSubmit();
        }}
        onSaveDraft={() => void saveAsDraft()}
        onPublish={() => void publishProduct()}
      />

      {err && <p style={{ color: "#fecaca", marginBottom: 12 }}>{err}</p>}
      {msg && <p style={{ color: "#166534", marginBottom: 12 }}>{msg}</p>}

      <AdminProductEditorTabs active={editorTab} onChange={setEditorTab} tabStatuses={tabStatuses} />

      <form
        id="admin-product-edit-form"
        onSubmit={saveProduct}
        style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}
      >
        {(editorTab === "basic" || editorTab === "pricing") && (
        <AdminProductFormSection
          title={editorTab === "pricing" ? "السعر والمخزون" : "المعلومات الأساسية"}
          subtitle={
            editorTab === "pricing"
              ? "السعر، SKU، المخزون، حالة التوفر"
              : "الاسم، العلامة، القسم، الوصف"
          }
        >
        {editorTab === "basic" ? (
        <>
        <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>القسم الرئيسي</label>
        <select
          value={product.categoryId}
          onChange={(e) => {
            const categoryId = Number(e.target.value);
            if (categoryId !== product.categoryId) {
              const hasSpecs = Object.values(displaySpecs).some((v) => v.trim()) || Object.values(filterSpecs).some((v) => v.trim());
              if (hasSpecs && !confirm("تغيير القسم قد يغيّر الفلاتر والمواصفات المطلوبة. هل تريد المتابعة؟ القيم الحالية تُحفظ حتى تحدّث السمات.")) {
                return;
              }
            }
            markDirty();
            setProduct({
              ...product,
              categoryId,
              secondaryCategoryIds: product.secondaryCategoryIds.filter((id) => id !== categoryId),
            });
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
        <p style={{ margin: "0 0 8px", fontSize: 12, opacity: 0.75 }}>
          يظهر المنتج أيضاً تحت هذه الأقسام في المتجر والتصفية. المواصفات (الفلاتر التفصيلية) تبقى مرتبطة بالقسم الرئيسي أعلاه.
        </p>
        <div
          style={{
            ...field,
            maxHeight: 220,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {categories
            .filter((c) => c.id !== product.categoryId)
            .map((c) => (
              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={product.secondaryCategoryIds.includes(c.id)}
                  onChange={() => {
                    const has = product.secondaryCategoryIds.includes(c.id);
                    setProduct({
                      ...product,
                      secondaryCategoryIds: has
                        ? product.secondaryCategoryIds.filter((x) => x !== c.id)
                        : [...product.secondaryCategoryIds, c.id],
                    });
                  }}
                />
                <span>
                  {c.nameEn} <span style={{ opacity: 0.7 }}>({c.slug})</span>
                </span>
              </label>
            ))}
        </div>

        <label style={{ color: "var(--admin-muted)", fontSize: 13 }}>العلامة (جدول)</label>
        <select
          value={product.brandId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            const bid = v === "" ? null : Number(v);
            const b = bid != null ? brands.find((x) => x.id === bid) : undefined;
            setProduct({
              ...product,
              brandId: bid,
              brand: b ? b.nameEn || b.nameAr : product.brand,
            });
          }}
          style={field}
        >
          <option value="">— بدون —</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nameAr} ({b.nameEn})
            </option>
          ))}
        </select>
        <input
          placeholder="نص العلامة الاحتياطي (حقل brand)"
          value={product.brand}
          onChange={(e) => setProduct({ ...product, brand: e.target.value })}
          style={field}
        />

        <input
          placeholder="الاسم EN *"
          value={product.nameEn}
          onChange={(e) => {
            markDirty();
            setProduct({ ...product, nameEn: e.target.value });
          }}
          required
          style={field}
        />
        <input
          placeholder="الاسم AR"
          value={product.nameAr}
          onChange={(e) => setProduct({ ...product, nameAr: e.target.value })}
          style={field}
        />
        <textarea
          placeholder="وصف EN"
          value={product.descEn}
          onChange={(e) => setProduct({ ...product, descEn: e.target.value })}
          rows={2}
          style={field}
        />
        <textarea
          placeholder="وصف AR"
          value={product.descAr}
          onChange={(e) => setProduct({ ...product, descAr: e.target.value })}
          rows={2}
          style={field}
        />
        </>
        ) : null}

        {editorTab === "pricing" ? (
        <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            placeholder="السعر IQD"
            value={String(product.price)}
            onChange={(e) => setProduct({ ...product, price: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })}
            style={field}
          />
          <input
            placeholder="سعر قبل الخصم"
            value={product.oldPrice != null ? String(product.oldPrice) : ""}
            onChange={(e) =>
              setProduct({
                ...product,
                oldPrice: e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : null,
              })
            }
            style={field}
          />
        </div>

        <input
          placeholder="SKU"
          value={product.sku}
          onChange={(e) => setProduct({ ...product, sku: e.target.value })}
          style={field}
        />
        <input
          placeholder="الكمية"
          type="number"
          value={product.quantity}
          onChange={(e) => setProduct({ ...product, quantity: parseInt(e.target.value, 10) || 0 })}
          style={field}
        />
        <input
          placeholder="الموديل (مثل ROG Strix G16)"
          value={product.model ?? ""}
          onChange={(e) => setProduct({ ...product, model: e.target.value })}
          style={field}
        />
        <input
          placeholder="سطر مختصر للبطاقة (legacy)"
          value={product.storage}
          onChange={(e) => setProduct({ ...product, storage: e.target.value })}
          style={field}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "var(--admin-muted)" }}>حالة المخزون</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {(
              [
                { id: "in", label: "متوفر" },
                { id: "out", label: "غير متوفر" },
                { id: "unset", label: "مخزون غير محدد" },
              ] as const
            ).map((opt) => (
              <label key={opt.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
                <input
                  type="radio"
                  name="stockMode"
                  checked={stockMode === opt.id}
                  onChange={() => {
                    markDirty();
                    if (opt.id === "in") setProduct({ ...product, inStock: true, quantity: Math.max(1, product.quantity) });
                    else if (opt.id === "out") setProduct({ ...product, inStock: false });
                    else setProduct({ ...product, inStock: true, quantity: 0 });
                  }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={product.featured}
              onChange={(e) => setProduct({ ...product, featured: e.target.checked })}
            />
            مميز
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input type="checkbox" checked={product.isNew} onChange={(e) => setProduct({ ...product, isNew: e.target.checked })} />
            جديد
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={product.published}
              onChange={(e) => setProduct({ ...product, published: e.target.checked })}
            />
            منشور في المتجر
          </label>
        </div>
        </>
        ) : null}
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
          categoryId={product.categoryId}
          onRetry={() => reloadSchema()}
          onChangeDisplay={(key, value) => {
            markDirty();
            setDisplaySpecs((prev) => ({ ...prev, [key]: value }));
          }}
          onChangeFilter={(key, value) => {
            markDirty();
            setFilterSpecs((prev) => ({ ...prev, [key]: value }));
          }}
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
          categoryId={product.categoryId}
          onRetry={() => reloadSchema()}
          onChangeDisplay={(key, value) => {
            markDirty();
            setDisplaySpecs((prev) => ({ ...prev, [key]: value }));
          }}
          onChangeFilter={(key, value) => {
            markDirty();
            setFilterSpecs((prev) => ({ ...prev, [key]: value }));
          }}
          fieldStyle={field}
        />
        ) : null}

        {editorTab === "preview" ? (
          <AdminProductPreviewPanel
            displaySpecs={displaySpecs}
            filterSpecs={filterSpecs}
            attributes={categoryAttributes}
            productName={product.nameAr || product.nameEn}
            priceLabel={`${product.price.toLocaleString("ar-IQ")} د.ع`}
            imageUrl={product.images[0]?.url ?? null}
            checklist={publishChecklist}
            publishing={saving}
            onSaveDraft={() => void saveAsDraft()}
            onPublish={() => void publishProduct()}
          />
        ) : null}
      </form>

      <AdminStickySaveBar
        visible={dirty}
        saving={saving}
        onSave={() => {
          const form = document.getElementById("admin-product-edit-form") as HTMLFormElement | null;
          form?.requestSubmit();
        }}
        onDiscard={() => {
          if (confirm("تجاهل التغييرات غير المحفوظة؟")) {
            setDirty(false);
            void loadAll();
          }
        }}
      />

      {editorTab === "images" ? (
      <>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>الصور</h2>
      <label style={{ color: "var(--admin-muted)", fontSize: 13, display: "block", marginBottom: 8 }}>
        نموذج 3D — رابط أو رفع ملف
      </label>
      <input
        dir="ltr"
        placeholder="رابط .glb إن وُجد"
        value={product.model3d ?? ""}
        onChange={(e) => setProduct({ ...product, model3d: e.target.value || null })}
        style={{ ...field, marginBottom: 10 }}
      />
      <input type="file" accept=".glb,.gltf" onChange={onModel3dFile} style={{ fontSize: 13, color: "var(--admin-text)", marginBottom: 20 }} />
      <h3 style={{ fontSize: 16, marginBottom: 12 }}>معرض الصور</h3>
      <input
        type="file"
        id="replace-image-input"
        accept="image/png,image/jpeg"
        style={{ display: "none" }}
        onChange={onPickReplaceFile}
      />
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: "0 0 8px" }}>
        استيراد صورة من رابط — يتم تنزيل الصورة وحفظها على الخادم (لا يُعتمد على الرابط الخارجي بعد الحفظ).
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "stretch",
          marginBottom: 14,
        }}
      >
        <input
          dir="ltr"
          type="url"
          inputMode="url"
          placeholder="https://example.com/image.jpg — رابط مباشر لصورة (يدعم Shopify CDN)"
          value={galleryUrlDraft}
          onChange={(e) => setGalleryUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void importGalleryUrlFromInput();
            }
          }}
          style={{ ...field, flex: "1 1 260px", minWidth: 200 }}
        />
        <button
          type="button"
          disabled={addingGalleryUrls || !galleryUrlDraft.trim()}
          onClick={() => void importGalleryUrlFromInput()}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #475569",
            background: addingGalleryUrls || !galleryUrlDraft.trim() ? "var(--admin-border)" : "var(--admin-surface-inset)",
            color: "var(--admin-text)",
            fontWeight: 600,
            cursor: addingGalleryUrls || !galleryUrlDraft.trim() ? "not-allowed" : "pointer",
            alignSelf: "center",
          }}
        >
          {addingGalleryUrls ? "جاري تنزيل الصورة…" : "تنزيل وحفظ الصورة"}
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (!files.length) return;
            try {
              const urls: string[] = [];
              for (const f of files) urls.push(await uploadAdminImage(f));
              await appendImages(urls);
            } catch {
              setErr("فشل رفع الصور");
            }
          }}
          style={{ fontSize: 13, color: "var(--admin-text)" }}
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #475569", background: "var(--admin-surface-inset)", color: "var(--admin-text)" }}
        >
          إضافة من المكتبة
        </button>
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multi
        onSelect={(rows: MediaRow[]) => {
          const urls = rows.filter((r) => r.kind === "image").map((r) => r.url);
          void appendImages(urls);
        }}
      />

      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {product.images.map((im, index) => (
          <li
            key={im.id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              padding: 12,
              background: "var(--admin-surface-inset)",
              borderRadius: 8,
              border: "1px solid #334155",
            }}
          >
            <img src={im.url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, wordBreak: "break-all", opacity: 0.85 }}>{im.url}</span>
              {im.url.startsWith("/uploads/") ? (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "rgba(22,163,74,0.12)",
                    color: "#166534",
                  }}
                  title={im.originalSourceUrl ?? undefined}
                >
                  محفوظ محليًا
                </span>
              ) : null}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                type="button"
                onClick={() => moveImage(index, -1)}
                disabled={index === 0}
                style={btn}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveImage(index, 1)}
                disabled={index === product.images.length - 1}
                style={btn}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplaceImageId(im.id);
                  document.getElementById("replace-image-input")?.click();
                }}
                style={btn}
              >
                استبدال
              </button>
              <button type="button" onClick={() => void deleteImage(im.id)} style={{ ...btn, color: "#fecaca" }}>
                حذف
              </button>
            </div>
          </li>
        ))}
      </ul>
      {product.images.length === 0 && (
        <p style={{ color: "var(--admin-muted)", fontSize: 14 }}>لا توجد صور — أضف من الرفع أو المكتبة أو رابط https.</p>
      )}
      </>
      ) : null}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #475569",
  background: "var(--admin-surface-muted)",
  color: "var(--admin-text)",
  cursor: "pointer",
  fontSize: 13,
};
