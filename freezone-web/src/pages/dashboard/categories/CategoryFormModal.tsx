import { useEffect, useRef, useState } from "react";
import {
  dashboardApi,
  DashboardApiError,
  uploadDashboardFile,
  type CategoryCreatePayload,
  type CategoryFull,
  type CategoryUpdatePayload,
} from "@/lib/dashboard/api";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
} from "@/components/dashboard/ui";

type Lang = "ar" | "en";

type FormState = {
  nameEn: string;
  nameAr: string;
  slug: string;
  parentId: string;
  icon: string;
  color: string;
  backgroundImageUrl: string;
  sortOrder: string;
  active: boolean;
};

const EMPTY: FormState = {
  nameEn: "",
  nameAr: "",
  slug: "",
  parentId: "",
  icon: "",
  color: "#64748b",
  backgroundImageUrl: "",
  sortOrder: "999",
  active: true,
};

function fromRow(c: CategoryFull): FormState {
  return {
    nameEn: c.nameEn,
    nameAr: c.nameAr,
    slug: c.slug,
    parentId: c.parentId != null ? String(c.parentId) : "",
    icon: c.icon ?? "",
    color: c.color || "#64748b",
    backgroundImageUrl: c.backgroundImageUrl ?? "",
    sortOrder: String(c.sortOrder ?? 999),
    active: c.active,
  };
}

function resolveImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

export function CategoryFormModal({
  open,
  category,
  allCategories,
  lang,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = create. */
  category: CategoryFull | null;
  /** Used to populate parent dropdown — excludes self + self-descendants on edit. */
  allCategories: CategoryFull[];
  lang: Lang;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = category != null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setForm(category ? fromRow(category) : EMPTY);
  }, [open, category]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onPickBackground = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr(lang === "ar" ? "اختر صورة." : "Pick an image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr(lang === "ar" ? "الحد الأقصى ٥ ميغابايت." : "Max 5 MB.");
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const { url } = await uploadDashboardFile(file, {
        register: true,
        title: form.nameEn || "Category background",
      });
      update("backgroundImageUrl", url);
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "UPLOAD_FAILED");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setErr(null);
    const nameEn = form.nameEn.trim();
    const nameAr = form.nameAr.trim() || nameEn;
    if (!nameEn) {
      setErr(lang === "ar" ? "الاسم بالإنجليزية مطلوب." : "English name is required.");
      return;
    }
    const sortOrderNum = Number(form.sortOrder);
    const sortOrder = Number.isFinite(sortOrderNum) ? sortOrderNum : 999;
    const parentId = form.parentId ? Number(form.parentId) : null;
    const backgroundImageUrl = form.backgroundImageUrl.trim() || null;

    setSaving(true);
    try {
      if (editing && category) {
        const payload: CategoryUpdatePayload = {
          nameEn,
          nameAr,
          slug: form.slug.trim() || undefined,
          parentId,
          icon: form.icon,
          color: form.color || "#64748b",
          backgroundImageUrl,
          sortOrder,
          active: form.active,
        };
        await dashboardApi.patch(`/api/admin/categories/${category.id}`, payload);
      } else {
        const payload: CategoryCreatePayload = {
          nameEn,
          nameAr,
          slug: form.slug.trim() || undefined,
          parentId,
          icon: form.icon || undefined,
          color: form.color || undefined,
          backgroundImageUrl,
          sortOrder,
          active: form.active,
        };
        await dashboardApi.post("/api/admin/categories", payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "SAVE_FAILED");
    } finally {
      setSaving(false);
    }
  };

  // Collect ids of `category` and all its descendants to exclude from parent options.
  const blockedIds = (() => {
    if (!category) return new Set<number>();
    const blocked = new Set<number>([category.id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of allCategories) {
        if (c.parentId != null && blocked.has(c.parentId) && !blocked.has(c.id)) {
          blocked.add(c.id);
          added = true;
        }
      }
    }
    return blocked;
  })();

  const parentOptions = [
    { value: "", label: lang === "ar" ? "— لا يوجد (قسم جذر) —" : "— None (top level) —" },
    ...allCategories
      .filter((c) => !blockedIds.has(c.id))
      .sort((a, b) =>
        (lang === "ar" ? a.nameAr || a.nameEn : a.nameEn).localeCompare(
          lang === "ar" ? b.nameAr || b.nameEn : b.nameEn,
        ),
      )
      .map((c) => ({
        value: String(c.id),
        label: lang === "ar" ? c.nameAr || c.nameEn : c.nameEn,
      })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        editing
          ? lang === "ar" ? "تعديل القسم" : "Edit category"
          : lang === "ar" ? "قسم جديد" : "New category"
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={save} loading={saving}>
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
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
              placeholder="Laptops"
            />
          </Field>
          <Field
            label={lang === "ar" ? "الاسم بالعربية" : "Name (Arabic)"}
            hint={lang === "ar" ? "اختياري." : "Optional."}
          >
            <Input
              value={form.nameAr}
              onChange={(e) => update("nameAr", e.target.value)}
              placeholder="لابتوبات"
            />
          </Field>
        </div>

        <Field
          label="Slug"
          hint={
            lang === "ar"
              ? "اختياري. يُولَّد من الاسم إن تُرك فارغاً."
              : "Optional. Auto-generated from the name if blank."
          }
        >
          <Input
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="laptops"
          />
        </Field>

        <Field label={lang === "ar" ? "القسم الأب" : "Parent category"}>
          <Select
            value={form.parentId}
            onChange={(e) => update("parentId", (e.target as HTMLSelectElement).value)}
            options={parentOptions}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Field
            label={lang === "ar" ? "الأيقونة" : "Icon"}
            hint={lang === "ar" ? "إيموجي أو اسم Lucide." : "Emoji or Lucide name."}
          >
            <Input
              value={form.icon}
              onChange={(e) => update("icon", e.target.value)}
              placeholder="💻"
            />
          </Field>
          <Field label={lang === "ar" ? "اللون" : "Color"}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="color"
                value={form.color}
                onChange={(e) => update("color", e.target.value)}
                style={{
                  width: 40,
                  height: 36,
                  border: "1px solid var(--fz-border, #e5e7eb)",
                  borderRadius: 6,
                  padding: 2,
                  background: "#fff",
                  cursor: "pointer",
                }}
              />
              <Input
                value={form.color}
                onChange={(e) => update("color", e.target.value)}
                placeholder="#64748b"
              />
            </div>
          </Field>
          <Field label={lang === "ar" ? "الترتيب" : "Sort order"}>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => update("sortOrder", e.target.value)}
            />
          </Field>
        </div>

        <Field label={lang === "ar" ? "صورة الخلفية" : "Background image"}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CategoryThumb
              url={form.backgroundImageUrl || null}
              icon={form.icon}
              color={form.color}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => onPickBackground(e.target.files?.[0])}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  loading={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {form.backgroundImageUrl
                    ? lang === "ar" ? "استبدال" : "Replace"
                    : lang === "ar" ? "رفع صورة" : "Upload image"}
                </Button>
                {form.backgroundImageUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => update("backgroundImageUrl", "")}
                  >
                    {lang === "ar" ? "إزالة" : "Remove"}
                  </Button>
                )}
              </div>
              <Input
                value={form.backgroundImageUrl}
                onChange={(e) => update("backgroundImageUrl", e.target.value)}
                placeholder={lang === "ar" ? "أو ألصق رابطاً" : "Or paste a URL"}
              />
            </div>
          </div>
        </Field>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 10,
            background: "var(--fz-bg-soft, #f8fafc)",
            borderRadius: "var(--fz-radius)",
            fontSize: 13,
          }}
        >
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => update("active", e.target.checked)}
          />
          <span>
            {lang === "ar"
              ? "نشط — يظهر في المتجر."
              : "Active — visible on the storefront."}
          </span>
        </label>
      </div>
    </Modal>
  );
}

function CategoryThumb({
  url,
  icon,
  color,
}: {
  url: string | null;
  icon: string;
  color: string;
}) {
  const src = resolveImage(url ?? undefined);
  return (
    <span
      style={{
        display: "inline-flex",
        width: 56,
        height: 56,
        borderRadius: 12,
        overflow: "hidden",
        background: color || "var(--fz-bg-soft, #f1f5f9)",
        color: "#fff",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        border: "1px solid var(--fz-border, #e5e7eb)",
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        icon || "📦"
      )}
    </span>
  );
}
