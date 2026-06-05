import { useEffect, useRef, useState } from "react";
import {
  dashboardApi,
  DashboardApiError,
  uploadDashboardFile,
  type PromoBanner,
  type PromoBannerPayload,
} from "@/lib/dashboard/api";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  Table,
  Textarea,
} from "@/components/dashboard/ui";

type Lang = "ar" | "en";

type FormState = {
  id?: number;
  titleEn: string;
  titleAr: string;
  subEn: string;
  subAr: string;
  imageUrl: string;
  href: string;
  catSlug: string;
  sortOrder: string;
  active: boolean;
};

const EMPTY: FormState = {
  titleEn: "",
  titleAr: "",
  subEn: "",
  subAr: "",
  imageUrl: "",
  href: "/products",
  catSlug: "",
  sortOrder: "0",
  active: true,
};

function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

export function PromoBannersTab({ lang }: { lang: Lang }) {
  const [rows, setRows] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editing = form.id != null;

  const load = () => {
    setLoading(true);
    dashboardApi
      .get<PromoBanner[]>("/api/admin/promo-banners")
      .then((d) => {
        setRows(d);
        setErr(null);
      })
      .catch((e) => setErr(e instanceof DashboardApiError ? e.code : (e as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => {
    setForm(EMPTY);
    setErr(null);
    setModalOpen(true);
  };
  const openEdit = (r: PromoBanner) => {
    setForm({
      id: r.id,
      titleEn: r.titleEn,
      titleAr: r.titleAr,
      subEn: r.subEn,
      subAr: r.subAr,
      imageUrl: r.imageUrl,
      href: r.href,
      catSlug: r.catSlug ?? "",
      sortOrder: String(r.sortOrder ?? 0),
      active: r.active,
    });
    setErr(null);
    setModalOpen(true);
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErr(lang === "ar" ? "الحد ٨ ميغابايت." : "Max 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadDashboardFile(file, {
        register: true,
        title: form.titleEn || "Promo banner",
      });
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "UPLOAD_FAILED");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    setErr(null);
    if (!form.titleEn.trim()) {
      setErr(lang === "ar" ? "العنوان بالإنجليزية مطلوب." : "Title (English) is required.");
      return;
    }
    if (!form.imageUrl.trim()) {
      setErr(lang === "ar" ? "الصورة مطلوبة." : "Image is required.");
      return;
    }
    setSaving(true);
    try {
      const payload: PromoBannerPayload = {
        titleEn: form.titleEn.trim(),
        titleAr: form.titleAr.trim() || form.titleEn.trim(),
        subEn: form.subEn,
        subAr: form.subAr,
        imageUrl: form.imageUrl.trim(),
        href: form.href.trim() || "/products",
        catSlug: form.catSlug.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
      };
      if (editing && form.id) {
        await dashboardApi.patch(`/api/admin/promo-banners/${form.id}`, payload);
      } else {
        await dashboardApi.post("/api/admin/promo-banners", payload);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "SAVE_FAILED");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (r: PromoBanner) => {
    if (!window.confirm(lang === "ar" ? "حذف البانر؟" : "Delete this banner?")) return;
    try {
      await dashboardApi.delete(`/api/admin/promo-banners/${r.id}`);
      load();
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : (e as Error).message);
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--fz-text-soft)" }}>
          {lang === "ar"
            ? "بانرات ترويجية تظهر على الصفحة الرئيسية."
            : "Promo banners shown on the homepage grid."}
        </div>
        <Button size="sm" onClick={openCreate}>
          + {lang === "ar" ? "بانر جديد" : "New banner"}
        </Button>
      </div>

      {loading ? (
        <div className="dashboard-loader" />
      ) : err ? (
        <div style={{ padding: 16, color: "var(--fz-danger)" }}>{err}</div>
      ) : (
        <Table
          rowKey={(r) => r.id}
          rows={rows}
          empty={lang === "ar" ? "لا بانرات بعد." : "No banners yet."}
          columns={[
            {
              header: "",
              width: "76px",
              cell: (r) => (
                <span
                  style={{
                    display: "inline-flex",
                    width: 56,
                    height: 40,
                    background: "var(--fz-bg-soft, #f1f5f9)",
                    border: "1px solid var(--fz-border, #e5e7eb)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  {r.imageUrl && (
                    <img
                      src={resolveImage(r.imageUrl)}
                      alt={r.titleEn}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                </span>
              ),
            },
            {
              header: lang === "ar" ? "العنوان" : "Title",
              cell: (r) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{lang === "ar" ? r.titleAr || r.titleEn : r.titleEn}</div>
                  {(r.subAr || r.subEn) && (
                    <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
                      {lang === "ar" ? r.subAr || r.subEn : r.subEn}
                    </div>
                  )}
                </div>
              ),
            },
            {
              header: lang === "ar" ? "الرابط" : "Link",
              cell: (r) => (
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--fz-text-soft)" }}>{r.href}</span>
              ),
            },
            {
              header: lang === "ar" ? "الترتيب" : "Sort",
              width: "80px",
              cell: (r) => <span style={{ color: "var(--fz-text-soft)" }}>{r.sortOrder}</span>,
            },
            {
              header: lang === "ar" ? "الحالة" : "Status",
              width: "100px",
              cell: (r) =>
                r.active ? (
                  <Badge tone="success">{lang === "ar" ? "نشط" : "Active"}</Badge>
                ) : (
                  <Badge tone="neutral">{lang === "ar" ? "معطّل" : "Disabled"}</Badge>
                ),
            },
            {
              header: "",
              cell: (r) => (
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                    {lang === "ar" ? "تعديل" : "Edit"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(r)}>
                    ✕
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? (lang === "ar" ? "تعديل بانر" : "Edit banner") : lang === "ar" ? "بانر جديد" : "New banner"}
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
            <Field label={lang === "ar" ? "العنوان (إنجليزي)" : "Title (English)"}>
              <Input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
            </Field>
            <Field label={lang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}>
              <Input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label={lang === "ar" ? "نص فرعي (إنجليزي)" : "Subtitle (English)"}>
              <Textarea rows={2} value={form.subEn} onChange={(e) => setForm({ ...form, subEn: e.target.value })} />
            </Field>
            <Field label={lang === "ar" ? "نص فرعي (عربي)" : "Subtitle (Arabic)"}>
              <Textarea rows={2} value={form.subAr} onChange={(e) => setForm({ ...form, subAr: e.target.value })} />
            </Field>
          </div>
          <Field label={lang === "ar" ? "الصورة" : "Image"}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span
                style={{
                  display: "inline-flex",
                  width: 100,
                  height: 70,
                  background: "var(--fz-bg-soft, #f1f5f9)",
                  border: "1px solid var(--fz-border, #e5e7eb)",
                  borderRadius: 6,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {form.imageUrl ? (
                  <img
                    src={resolveImage(form.imageUrl)}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ color: "var(--fz-text-muted)" }}>—</span>
                )}
              </span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => onUpload(e.target.files?.[0])}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    loading={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {form.imageUrl ? (lang === "ar" ? "استبدال" : "Replace") : lang === "ar" ? "رفع" : "Upload"}
                  </Button>
                </div>
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder={lang === "ar" ? "أو ألصق رابطاً" : "Or paste a URL"}
                />
              </div>
            </div>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label={lang === "ar" ? "رابط الزر" : "Click-through link"}>
              <Input value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} placeholder="/products" />
            </Field>
            <Field label={lang === "ar" ? "Slug القسم (اختياري)" : "Category slug (optional)"}>
              <Input value={form.catSlug} onChange={(e) => setForm({ ...form, catSlug: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center" }}>
            <Field label={lang === "ar" ? "الترتيب" : "Sort order"}>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              {lang === "ar" ? "نشط" : "Active"}
            </label>
          </div>
        </div>
      </Modal>
    </>
  );
}
