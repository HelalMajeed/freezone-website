import { useEffect, useRef, useState } from "react";
import {
  dashboardApi,
  DashboardApiError,
  uploadDashboardFile,
  type ShowroomMediaItem,
  type ShowroomMediaPayload,
} from "@/lib/dashboard/api";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  Select,
  Table,
} from "@/components/dashboard/ui";

type Lang = "ar" | "en";

type FormState = {
  id?: number;
  kind: "image" | "video";
  url: string;
  titleEn: string;
  titleAr: string;
  sortOrder: string;
};

const EMPTY: FormState = {
  kind: "image",
  url: "",
  titleEn: "",
  titleAr: "",
  sortOrder: "0",
};

function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

export function ShowroomMediaTab({ lang }: { lang: Lang }) {
  const [rows, setRows] = useState<ShowroomMediaItem[]>([]);
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
      .get<ShowroomMediaItem[]>("/api/admin/showroom-media")
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
  const openEdit = (r: ShowroomMediaItem) => {
    setForm({
      id: r.id,
      kind: r.kind,
      url: r.url,
      titleEn: r.titleEn ?? "",
      titleAr: r.titleAr ?? "",
      sortOrder: String(r.sortOrder),
    });
    setErr(null);
    setModalOpen(true);
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      setErr(lang === "ar" ? "الحد ١٦ ميغابايت." : "Max 16 MB.");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadDashboardFile(file, {
        register: true,
        title: form.titleEn || "Showroom media",
      });
      setForm((f) => ({ ...f, url, kind: file.type.startsWith("video") ? "video" : "image" }));
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "UPLOAD_FAILED");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    setErr(null);
    if (!form.url.trim()) {
      setErr(lang === "ar" ? "الرابط مطلوب." : "URL is required.");
      return;
    }
    setSaving(true);
    try {
      const payload: ShowroomMediaPayload = {
        kind: form.kind,
        url: form.url.trim(),
        titleEn: form.titleEn.trim() || null,
        titleAr: form.titleAr.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing && form.id) {
        await dashboardApi.patch(`/api/admin/showroom-media/${form.id}`, payload);
      } else {
        await dashboardApi.post("/api/admin/showroom-media", payload);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "SAVE_FAILED");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (r: ShowroomMediaItem) => {
    if (!window.confirm(lang === "ar" ? "حذف العنصر؟" : "Delete this item?")) return;
    try {
      await dashboardApi.delete(`/api/admin/showroom-media/${r.id}`);
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
            ? "صور وفيديوهات قسم الـ Showroom في الصفحة الرئيسية."
            : "Images and videos for the homepage showroom section."}
        </div>
        <Button size="sm" onClick={openCreate}>
          + {lang === "ar" ? "إضافة" : "Add"}
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
          empty={lang === "ar" ? "لا وسائط بعد." : "No media yet."}
          columns={[
            {
              header: "",
              width: "84px",
              cell: (r) => (
                <span
                  style={{
                    display: "inline-flex",
                    width: 64,
                    height: 40,
                    background: "var(--fz-bg-soft, #f1f5f9)",
                    border: "1px solid var(--fz-border, #e5e7eb)",
                    borderRadius: 6,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {r.kind === "image" ? (
                    <img
                      src={resolveImage(r.url)}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: 18 }}>🎬</span>
                  )}
                </span>
              ),
            },
            {
              header: lang === "ar" ? "النوع" : "Kind",
              width: "100px",
              cell: (r) => <Badge tone="info">{r.kind}</Badge>,
            },
            {
              header: lang === "ar" ? "العنوان" : "Title",
              cell: (r) => (
                <span>{lang === "ar" ? r.titleAr || r.titleEn || "—" : r.titleEn || r.titleAr || "—"}</span>
              ),
            },
            {
              header: lang === "ar" ? "الترتيب" : "Sort",
              width: "80px",
              cell: (r) => <span style={{ color: "var(--fz-text-soft)" }}>{r.sortOrder}</span>,
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
        title={editing ? (lang === "ar" ? "تعديل" : "Edit") : lang === "ar" ? "إضافة" : "Add"}
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
          <Field label={lang === "ar" ? "النوع" : "Kind"}>
            <Select
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: (e.target as HTMLSelectElement).value as "image" | "video" })
              }
              options={[
                { value: "image", label: lang === "ar" ? "صورة" : "Image" },
                { value: "video", label: lang === "ar" ? "فيديو" : "Video" },
              ]}
            />
          </Field>
          <Field label="URL">
            <div style={{ display: "flex", gap: 6 }}>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder={
                  form.kind === "video"
                    ? "https://youtube.com/watch?v=..."
                    : lang === "ar"
                      ? "أو ارفع صورة بالأسفل"
                      : "Or upload an image below"
                }
              />
            </div>
          </Field>
          {form.kind === "image" && (
            <Field label={lang === "ar" ? "رفع صورة" : "Upload image"}>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => onUpload(e.target.files?.[0])}
              />
              <Button
                size="sm"
                variant="secondary"
                type="button"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {form.url ? (lang === "ar" ? "استبدال" : "Replace") : lang === "ar" ? "اختر صورة" : "Pick image"}
              </Button>
            </Field>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label={lang === "ar" ? "العنوان (إنجليزي)" : "Title (English)"}>
              <Input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
            </Field>
            <Field label={lang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}>
              <Input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
            </Field>
          </div>
          <Field label={lang === "ar" ? "الترتيب" : "Sort order"}>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
