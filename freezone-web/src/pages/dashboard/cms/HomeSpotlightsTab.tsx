import { useEffect, useRef, useState } from "react";
import {
  dashboardApi,
  DashboardApiError,
  uploadDashboardFile,
  type HomeSpotlight,
  type HomeSpotlightPayload,
} from "@/lib/dashboard/api";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  Table,
} from "@/components/dashboard/ui";

type Lang = "ar" | "en";

type FormState = {
  id?: number;
  labelEn: string;
  labelAr: string;
  href: string;
  imageUrl: string;
  iconKey: string;
  sortOrder: string;
  active: boolean;
};

const EMPTY: FormState = {
  labelEn: "",
  labelAr: "",
  href: "/products",
  imageUrl: "",
  iconKey: "",
  sortOrder: "0",
  active: true,
};

function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

export function HomeSpotlightsTab({ lang }: { lang: Lang }) {
  const [rows, setRows] = useState<HomeSpotlight[]>([]);
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
      .get<HomeSpotlight[]>("/api/admin/home-spotlights")
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
  const openEdit = (r: HomeSpotlight) => {
    setForm({
      id: r.id,
      labelEn: r.labelEn,
      labelAr: r.labelAr,
      href: r.href,
      imageUrl: r.imageUrl ?? "",
      iconKey: r.iconKey ?? "",
      sortOrder: String(r.sortOrder),
      active: r.active,
    });
    setErr(null);
    setModalOpen(true);
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr(lang === "ar" ? "الحد ٥ ميغابايت." : "Max 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadDashboardFile(file, {
        register: true,
        title: form.labelEn || "Home spotlight",
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
    if (!form.labelEn.trim()) {
      setErr(lang === "ar" ? "العنوان بالإنجليزية مطلوب." : "Label (English) is required.");
      return;
    }
    setSaving(true);
    try {
      const payload: HomeSpotlightPayload = {
        labelEn: form.labelEn.trim(),
        labelAr: form.labelAr.trim() || form.labelEn.trim(),
        href: form.href.trim() || "/products",
        imageUrl: form.imageUrl.trim() || null,
        iconKey: form.iconKey.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
      };
      if (editing && form.id) {
        await dashboardApi.patch(`/api/admin/home-spotlights/${form.id}`, payload);
      } else {
        await dashboardApi.post("/api/admin/home-spotlights", payload);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "SAVE_FAILED");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (r: HomeSpotlight) => {
    if (!window.confirm(lang === "ar" ? "حذف العنصر؟" : "Delete this item?")) return;
    try {
      await dashboardApi.delete(`/api/admin/home-spotlights/${r.id}`);
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
            ? "شريط الفئات الدائري في الصفحة الرئيسية."
            : "Circular category strip on the homepage."}
        </div>
        <Button size="sm" onClick={openCreate}>
          + {lang === "ar" ? "عنصر جديد" : "New item"}
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
          empty={lang === "ar" ? "لا عناصر بعد." : "No items yet."}
          columns={[
            {
              header: "",
              width: "60px",
              cell: (r) => (
                <span
                  style={{
                    display: "inline-flex",
                    width: 44,
                    height: 44,
                    background: "var(--fz-bg-soft, #f1f5f9)",
                    border: "1px solid var(--fz-border, #e5e7eb)",
                    borderRadius: 999,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {r.imageUrl ? (
                    <img
                      src={resolveImage(r.imageUrl)}
                      alt={r.labelEn}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : r.iconKey ? (
                    <span style={{ fontSize: 11, fontFamily: "monospace" }}>{r.iconKey}</span>
                  ) : (
                    <span style={{ fontSize: 18 }}>★</span>
                  )}
                </span>
              ),
            },
            {
              header: lang === "ar" ? "العنوان" : "Label",
              cell: (r) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{lang === "ar" ? r.labelAr || r.labelEn : r.labelEn}</div>
                  <div style={{ fontSize: 12, color: "var(--fz-text-muted)", fontFamily: "monospace" }}>
                    {r.href}
                  </div>
                </div>
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
        title={editing ? (lang === "ar" ? "تعديل العنصر" : "Edit item") : lang === "ar" ? "عنصر جديد" : "New item"}
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
            <Field label={lang === "ar" ? "العنوان (إنجليزي)" : "Label (English)"}>
              <Input value={form.labelEn} onChange={(e) => setForm({ ...form, labelEn: e.target.value })} />
            </Field>
            <Field label={lang === "ar" ? "العنوان (عربي)" : "Label (Arabic)"}>
              <Input value={form.labelAr} onChange={(e) => setForm({ ...form, labelAr: e.target.value })} />
            </Field>
          </div>
          <Field label={lang === "ar" ? "الرابط" : "Link"}>
            <Input value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} placeholder="/products" />
          </Field>
          <Field label={lang === "ar" ? "الصورة (تكون أولوية على الأيقونة)" : "Image (takes priority over icon)"}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span
                style={{
                  display: "inline-flex",
                  width: 60,
                  height: 60,
                  background: "var(--fz-bg-soft, #f1f5f9)",
                  border: "1px solid var(--fz-border, #e5e7eb)",
                  borderRadius: 999,
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
                  {form.imageUrl && (
                    <Button size="sm" variant="ghost" type="button" onClick={() => setForm({ ...form, imageUrl: "" })}>
                      {lang === "ar" ? "إزالة" : "Remove"}
                    </Button>
                  )}
                </div>
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder={lang === "ar" ? "أو ألصق رابطاً" : "Or paste a URL"}
                />
              </div>
            </div>
          </Field>
          <Field
            label={lang === "ar" ? "أيقونة Lucide (بديل عن الصورة)" : "Lucide icon (fallback when no image)"}
            hint={lang === "ar" ? "مثل sparkles, gamepad-2, laptop." : "e.g. sparkles, gamepad-2, laptop."}
          >
            <Input value={form.iconKey} onChange={(e) => setForm({ ...form, iconKey: e.target.value })} />
          </Field>
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
