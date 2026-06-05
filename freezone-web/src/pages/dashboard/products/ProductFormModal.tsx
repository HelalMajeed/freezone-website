import { useEffect, useState } from "react";
import {
  dashboardApi,
  DashboardApiError,
  type Brand,
  type CategoryOption,
  type ProductCatalogStatus,
  type ProductCreatePayload,
  type ProductDetail,
  type ProductUpdatePayload,
} from "@/lib/dashboard/api";
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/dashboard/ui";
import { ProductImagesEditor } from "./ProductImagesEditor";

type Lang = "ar" | "en";

type FormState = {
  nameEn: string;
  nameAr: string;
  categoryId: string;
  brandId: string;
  sku: string;
  model: string;
  price: string;
  oldPrice: string;
  quantity: string;
  descEn: string;
  descAr: string;
  catalogStatus: ProductCatalogStatus;
  published: boolean;
  featured: boolean;
  isNew: boolean;
  images: string[];
};

const EMPTY: FormState = {
  nameEn: "",
  nameAr: "",
  categoryId: "",
  brandId: "",
  sku: "",
  model: "",
  price: "",
  oldPrice: "",
  quantity: "0",
  descEn: "",
  descAr: "",
  catalogStatus: "DRAFT",
  published: false,
  featured: false,
  isNew: false,
  images: [],
};

const STATUS_LABELS: Record<ProductCatalogStatus, { en: string; ar: string }> = {
  DRAFT: { en: "Draft", ar: "مسودة" },
  PENDING_REVIEW: { en: "Pending review", ar: "بانتظار المراجعة" },
  CHANGES_REQUESTED: { en: "Changes requested", ar: "تعديلات مطلوبة" },
  PUBLISHED: { en: "Published", ar: "منشور" },
  ARCHIVED: { en: "Archived", ar: "مؤرشف" },
};

function fromDetail(p: ProductDetail): FormState {
  return {
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    categoryId: String(p.categoryId),
    brandId: p.brandId != null ? String(p.brandId) : "",
    sku: p.sku === "—" ? "" : p.sku,
    model: p.model,
    price: String(p.price),
    oldPrice: p.oldPrice != null ? String(p.oldPrice) : "",
    quantity: String(p.quantity),
    descEn: p.descEn,
    descAr: p.descAr,
    catalogStatus: p.catalogStatus,
    published: p.published,
    featured: p.featured,
    isNew: p.isNew,
    images: p.images.map((i) => i.url),
  };
}

export function ProductFormModal({
  open,
  productId,
  categories,
  brands,
  lang,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = create. number = edit existing product. */
  productId: number | null;
  categories: CategoryOption[];
  brands: Brand[];
  lang: Lang;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = productId != null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (productId == null) {
      setForm(EMPTY);
      return;
    }
    setLoading(true);
    dashboardApi
      .get<ProductDetail>(`/api/admin/products/${productId}`)
      .then((p) => setForm(fromDetail(p)))
      .catch((e) => setErr(e instanceof DashboardApiError ? e.code : "LOAD_FAILED"))
      .finally(() => setLoading(false));
  }, [open, productId]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setErr(null);

    const nameEn = form.nameEn.trim();
    const nameAr = form.nameAr.trim() || nameEn;
    const categoryId = Number(form.categoryId);
    const priceNum = Number(form.price);

    if (!nameEn) {
      setErr(lang === "ar" ? "اسم المنتج بالإنجليزية مطلوب." : "Product name (English) is required.");
      return;
    }
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      setErr(lang === "ar" ? "اختر قسماً." : "Pick a category.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setErr(lang === "ar" ? "السعر غير صالح." : "Invalid price.");
      return;
    }

    const brandIdNum = form.brandId ? Number(form.brandId) : null;
    const brandLabel = brandIdNum
      ? brands.find((b) => b.id === brandIdNum)?.nameEn ?? "—"
      : "—";

    const quantityNum = Number(form.quantity);
    const oldPriceNum = form.oldPrice ? Number(form.oldPrice) : null;

    setSaving(true);
    try {
      if (editing && productId != null) {
        const payload: ProductUpdatePayload = {
          categoryId,
          nameEn,
          nameAr,
          price: priceNum,
          brandId: brandIdNum,
          brand: brandLabel,
          sku: form.sku.trim() || "—",
          model: form.model.trim(),
          quantity: Number.isFinite(quantityNum) ? quantityNum : 0,
          descEn: form.descEn,
          descAr: form.descAr,
          oldPrice: oldPriceNum != null && Number.isFinite(oldPriceNum) ? oldPriceNum : null,
          catalogStatus: form.catalogStatus,
          published: form.published,
          featured: form.featured,
          isNew: form.isNew,
        };
        await dashboardApi.patch(`/api/admin/products/${productId}`, payload);
        await dashboardApi.put(`/api/admin/products/${productId}/images`, {
          urls: form.images,
        });
      } else {
        const payload: ProductCreatePayload = {
          categoryId,
          nameEn,
          nameAr,
          price: priceNum,
          brandId: brandIdNum,
          brand: brandLabel,
          sku: form.sku.trim() || undefined,
          model: form.model.trim() || undefined,
          quantity: Number.isFinite(quantityNum) ? quantityNum : 0,
          descEn: form.descEn || undefined,
          descAr: form.descAr || undefined,
          oldPrice: oldPriceNum != null && Number.isFinite(oldPriceNum) ? oldPriceNum : null,
          published: form.published,
          featured: form.featured,
          isNew: form.isNew,
          images: form.images,
        };
        await dashboardApi.post("/api/admin/products", payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "SAVE_FAILED");
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = [
    { value: "", label: lang === "ar" ? "— اختر —" : "— Pick —" },
    ...categories.map((c) => ({
      value: String(c.id),
      label: lang === "ar" ? c.nameAr : c.nameEn,
    })),
  ];

  const brandOptions = [
    { value: "", label: lang === "ar" ? "— بدون علامة —" : "— No brand —" },
    ...brands.map((b) => ({
      value: String(b.id),
      label: lang === "ar" ? b.nameAr : b.nameEn,
    })),
  ];

  const statusOptions = (Object.keys(STATUS_LABELS) as ProductCatalogStatus[]).map((s) => ({
    value: s,
    label: STATUS_LABELS[s][lang],
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        editing
          ? lang === "ar" ? "تعديل المنتج" : "Edit product"
          : lang === "ar" ? "منتج جديد" : "New product"
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={save} loading={saving} disabled={loading}>
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="dashboard-loader" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {err && (
            <div
              style={{
                background: "var(--fz-danger-bg)",
                color: "var(--fz-danger)",
                padding: "10px 14px",
                borderRadius: "var(--fz-radius)",
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field
              label={lang === "ar" ? "الاسم بالإنجليزية" : "Name (English)"}
              hint={lang === "ar" ? "مطلوب." : "Required."}
            >
              <Input
                value={form.nameEn}
                onChange={(e) => update("nameEn", e.target.value)}
                placeholder="ROG Strix G16"
              />
            </Field>
            <Field
              label={lang === "ar" ? "الاسم بالعربية" : "Name (Arabic)"}
              hint={lang === "ar" ? "اختياري." : "Optional."}
            >
              <Input
                value={form.nameAr}
                onChange={(e) => update("nameAr", e.target.value)}
                placeholder="ROG Strix G16"
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label={lang === "ar" ? "القسم" : "Category"}>
              <Select
                value={form.categoryId}
                onChange={(e) =>
                  update("categoryId", (e.target as HTMLSelectElement).value)
                }
                options={categoryOptions}
              />
            </Field>
            <Field label={lang === "ar" ? "العلامة" : "Brand"}>
              <Select
                value={form.brandId}
                onChange={(e) =>
                  update("brandId", (e.target as HTMLSelectElement).value)
                }
                options={brandOptions}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label={lang === "ar" ? "السعر (دينار)" : "Price (IQD)"}>
              <Input
                type="number"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field
              label={lang === "ar" ? "السعر قبل الخصم" : "Compare-at price"}
              hint={lang === "ar" ? "اختياري." : "Optional."}
            >
              <Input
                type="number"
                inputMode="numeric"
                value={form.oldPrice}
                onChange={(e) => update("oldPrice", e.target.value)}
                placeholder=""
              />
            </Field>
            <Field label={lang === "ar" ? "الكمية" : "Stock"}>
              <Input
                type="number"
                inputMode="numeric"
                value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="SKU">
              <Input
                value={form.sku}
                onChange={(e) => update("sku", e.target.value)}
                placeholder=""
              />
            </Field>
            <Field label={lang === "ar" ? "اسم الموديل" : "Model"}>
              <Input
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                placeholder=""
              />
            </Field>
          </div>

          <Field label={lang === "ar" ? "الوصف بالإنجليزية" : "Description (English)"}>
            <Textarea
              rows={3}
              value={form.descEn}
              onChange={(e) => update("descEn", e.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "الوصف بالعربية" : "Description (Arabic)"}>
            <Textarea
              rows={3}
              value={form.descAr}
              onChange={(e) => update("descAr", e.target.value)}
            />
          </Field>

          <Field label={lang === "ar" ? "الصور" : "Images"}>
            <ProductImagesEditor
              value={form.images}
              onChange={(next) => update("images", next)}
              lang={lang}
            />
          </Field>

          {editing && (
            <Field label={lang === "ar" ? "حالة الكتالوج" : "Catalog status"}>
              <Select
                value={form.catalogStatus}
                onChange={(e) =>
                  update(
                    "catalogStatus",
                    (e.target as HTMLSelectElement).value as ProductCatalogStatus,
                  )
                }
                options={statusOptions}
              />
            </Field>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              padding: 12,
              background: "var(--fz-bg-soft, #f8fafc)",
              borderRadius: "var(--fz-radius)",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => update("published", e.target.checked)}
              />
              {lang === "ar" ? "منشور" : "Published"}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => update("featured", e.target.checked)}
              />
              {lang === "ar" ? "مميّز" : "Featured"}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.isNew}
                onChange={(e) => update("isNew", e.target.checked)}
              />
              {lang === "ar" ? "جديد" : "New"}
            </label>
          </div>
        </div>
      )}
    </Modal>
  );
}
