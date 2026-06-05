import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  dashboardApi,
  DashboardApiError,
  uploadDashboardFile,
  type Brand,
  type BrandUpdatePayload,
} from "@/lib/dashboard/api";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Table,
} from "@/components/dashboard/ui";

type Lang = "ar" | "en";

type BrandFormState = {
  id?: number;
  nameEn: string;
  nameAr: string;
  slug: string;
  logoUrl: string;
  sortOrder: string; // string for the input; coerced on save
  active: boolean;
};

const EMPTY_FORM: BrandFormState = {
  nameEn: "",
  nameAr: "",
  slug: "",
  logoUrl: "",
  sortOrder: "0",
  active: true,
};

/** Resolve an uploaded image URL ("/uploads/x.png") to an absolute API URL. */
function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

export function DashboardBrandsPage() {
  const { i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en") as Lang;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BrandFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editing = form.id != null;

  const load = () => {
    setLoading(true);
    dashboardApi
      .get<Brand[]>("/api/admin/brands")
      .then((rows) => {
        setBrands(rows);
        setErr(null);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.nameEn.toLowerCase().includes(q) ||
        b.nameAr.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q),
    );
  }, [brands, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErr(null);
    setModalOpen(true);
  };

  const openEdit = (b: Brand) => {
    setForm({
      id: b.id,
      nameEn: b.nameEn,
      nameAr: b.nameAr,
      slug: b.slug,
      logoUrl: b.logoUrl ?? "",
      sortOrder: String(b.sortOrder ?? 0),
      active: b.active,
    });
    setFormErr(null);
    setModalOpen(true);
  };

  const onPickLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormErr(lang === "ar" ? "اختر صورة فقط." : "Pick an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormErr(lang === "ar" ? "الحد الأقصى ٥ ميغابايت." : "Max size is 5 MB.");
      return;
    }
    setUploading(true);
    setFormErr(null);
    try {
      const { url } = await uploadDashboardFile(file, {
        register: true,
        title: form.nameEn || form.nameAr || "Brand logo",
        altEn: form.nameEn,
        altAr: form.nameAr,
      });
      setForm((f) => ({ ...f, logoUrl: url }));
    } catch (e) {
      setFormErr(e instanceof DashboardApiError ? e.code : "UPLOAD_FAILED");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    setFormErr(null);
    try {
      const nameEn = form.nameEn.trim();
      const nameAr = form.nameAr.trim() || nameEn;
      if (!nameEn) {
        setFormErr(lang === "ar" ? "الاسم بالإنجليزية مطلوب." : "English name is required.");
        setSaving(false);
        return;
      }
      const sortOrderNum = Number(form.sortOrder);
      const sortOrder = Number.isFinite(sortOrderNum) ? sortOrderNum : 0;
      const logoUrl = form.logoUrl.trim() || null;

      if (editing && form.id) {
        const payload: BrandUpdatePayload = {
          nameEn,
          nameAr,
          logoUrl,
          sortOrder,
          active: form.active,
        };
        await dashboardApi.patch(`/api/admin/brands/${form.id}`, payload);
      } else {
        await dashboardApi.post("/api/admin/brands", {
          nameEn,
          nameAr,
          slug: form.slug.trim() || undefined,
          logoUrl,
          sortOrder,
        });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setFormErr(e instanceof DashboardApiError ? e.code : "UNKNOWN");
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (b: Brand) => {
    try {
      await dashboardApi.patch(`/api/admin/brands/${b.id}`, { active: !b.active });
      load();
    } catch (e) {
      if (e instanceof DashboardApiError) setErr(e.code);
    }
  };

  const onDelete = async (b: Brand) => {
    const sure = window.confirm(
      lang === "ar"
        ? `هل تريد حذف العلامة "${b.nameAr || b.nameEn}"؟ سيُزال ربطها من المنتجات.`
        : `Delete brand "${b.nameEn}"? Products will be unlinked from it.`,
    );
    if (!sure) return;
    try {
      await dashboardApi.delete(`/api/admin/brands/${b.id}`);
      load();
    } catch (e) {
      if (e instanceof DashboardApiError) setErr(e.code);
    }
  };

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "العلامات التجارية" : "Brands"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "أضِف العلامات، ارفع الشعارات، وتحكّم بالترتيب والحالة."
              : "Add brands, upload logos, and control sort order and active state."}
          </div>
        </div>
        <Button onClick={openCreate}>
          + {lang === "ar" ? "إضافة علامة" : "Add brand"}
        </Button>
      </div>

      <Card tight>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--fz-border, #e5e7eb)" }}>
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث بالاسم أو الـ slug…" : "Search by name or slug…"}
          />
        </div>

        {loading ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div style={{ padding: 20, color: "var(--fz-danger)" }}>{err}</div>
        ) : (
          <Table
            rowKey={(b) => b.id}
            rows={filtered}
            empty={
              brands.length === 0
                ? lang === "ar"
                  ? "لا توجد علامات بعد. أنشئ أول علامة."
                  : "No brands yet. Create your first brand."
                : lang === "ar"
                  ? "لا نتائج مطابقة."
                  : "No matches."
            }
            columns={[
              {
                header: lang === "ar" ? "الشعار" : "Logo",
                width: "72px",
                cell: (b) => (
                  <BrandLogo url={b.logoUrl} name={lang === "ar" ? b.nameAr : b.nameEn} />
                ),
              },
              {
                header: lang === "ar" ? "الاسم" : "Name",
                cell: (b) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {lang === "ar" ? b.nameAr || b.nameEn : b.nameEn}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>{b.slug}</div>
                  </div>
                ),
              },
              {
                header: lang === "ar" ? "الترتيب" : "Sort",
                width: "80px",
                cell: (b) => (
                  <span style={{ color: "var(--fz-text-soft)" }}>{b.sortOrder}</span>
                ),
              },
              {
                header: lang === "ar" ? "الحالة" : "Status",
                width: "100px",
                cell: (b) =>
                  b.active ? (
                    <Badge tone="success">{lang === "ar" ? "نشطة" : "Active"}</Badge>
                  ) : (
                    <Badge tone="neutral">{lang === "ar" ? "معطّلة" : "Disabled"}</Badge>
                  ),
              },
              {
                header: "",
                cell: (b) => (
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <Button size="sm" variant="secondary" onClick={() => onToggleActive(b)}>
                      {b.active
                        ? lang === "ar" ? "تعطيل" : "Disable"
                        : lang === "ar" ? "تفعيل" : "Enable"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(b)}>
                      {lang === "ar" ? "تعديل" : "Edit"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(b)}>
                      ✕
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? lang === "ar" ? "تعديل العلامة" : "Edit brand"
            : lang === "ar" ? "علامة جديدة" : "New brand"
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={onSave} loading={saving}>
              {lang === "ar" ? "حفظ" : "Save"}
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {formErr && (
            <div
              style={{
                background: "var(--fz-danger-bg)",
                color: "var(--fz-danger)",
                padding: "10px 14px",
                borderRadius: "var(--fz-radius)",
                fontSize: 13,
              }}
            >
              {formErr}
            </div>
          )}

          <Field
            label={lang === "ar" ? "الاسم بالإنجليزية" : "Name (English)"}
            hint={lang === "ar" ? "مطلوب." : "Required."}
          >
            <Input
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              placeholder="Acme"
            />
          </Field>

          <Field
            label={lang === "ar" ? "الاسم بالعربية" : "Name (Arabic)"}
            hint={
              lang === "ar"
                ? "اختياري. إن تُرك فارغاً يُستخدم الاسم الإنجليزي."
                : "Optional. Falls back to the English name."
            }
          >
            <Input
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              placeholder="أكمي"
            />
          </Field>

          {!editing && (
            <Field
              label="Slug"
              hint={
                lang === "ar"
                  ? "اختياري. يُولَّد من الاسم الإنجليزي إن تُرك فارغاً."
                  : "Optional. Auto-generated from the English name if blank."
              }
            >
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="acme"
              />
            </Field>
          )}

          <Field label={lang === "ar" ? "الشعار" : "Logo"}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <BrandLogo url={form.logoUrl || null} name={form.nameEn || "?"} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => onPickLogo(e.target.files?.[0])}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploading}
                    type="button"
                  >
                    {form.logoUrl
                      ? lang === "ar" ? "استبدال" : "Replace"
                      : lang === "ar" ? "رفع شعار" : "Upload logo"}
                  </Button>
                  {form.logoUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setForm({ ...form, logoUrl: "" })}
                      type="button"
                    >
                      {lang === "ar" ? "إزالة" : "Remove"}
                    </Button>
                  )}
                </div>
                <Input
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder={lang === "ar" ? "أو ألصق رابط الشعار" : "Or paste a logo URL"}
                />
              </div>
            </div>
          </Field>

          <Field
            label={lang === "ar" ? "الترتيب" : "Sort order"}
            hint={lang === "ar" ? "الأرقام الأصغر تظهر أولاً." : "Lower numbers appear first."}
          >
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              placeholder="0"
            />
          </Field>

          {editing && (
            <Field label={lang === "ar" ? "الحالة" : "Status"}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span style={{ fontSize: 13, color: "var(--fz-text-soft)" }}>
                  {lang === "ar"
                    ? "نشطة (تظهر للزبائن في المتجر)."
                    : "Active (visible to customers on the storefront)."}
                </span>
              </label>
            </Field>
          )}
        </div>
      </Modal>
    </>
  );
}

function BrandLogo({ url, name }: { url: string | null; name: string }) {
  const src = resolveImage(url);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: 10,
        background: "var(--fz-bg-soft, #f1f5f9)",
        border: "1px solid var(--fz-border, #e5e7eb)",
        overflow: "hidden",
        fontWeight: 600,
        color: "var(--fz-text-muted, #64748b)",
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

export default DashboardBrandsPage;
