import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  dashboardApi,
  DashboardApiError,
  uploadDashboardFile,
  type MediaAsset,
  type MediaKind,
  type MediaUpdatePayload,
} from "@/lib/dashboard/api";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
} from "@/components/dashboard/ui";

type Lang = "ar" | "en";

const KIND_LABELS: Record<MediaKind, { en: string; ar: string }> = {
  image: { en: "Image", ar: "صورة" },
  video: { en: "Video", ar: "فيديو" },
  model3d: { en: "3D model", ar: "نموذج ثلاثي" },
};

function resolveUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

function formatBytes(bytes: number | null, lang: Lang): string {
  if (bytes == null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const num = value.toFixed(value >= 10 || unit === 0 ? 0 : 1);
  return lang === "ar" ? `${num} ${units[unit]}` : `${num} ${units[unit]}`;
}

export function DashboardMediaPage() {
  const { i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en") as Lang;

  const [rows, setRows] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"" | MediaKind>("");

  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAltAr, setEditAltAr] = useState("");
  const [editAltEn, setEditAltEn] = useState("");
  const [editKind, setEditKind] = useState<MediaKind>("image");
  const [saving, setSaving] = useState(false);

  const load = (q?: string) => {
    setLoading(true);
    const url = q && q.trim() ? `/api/admin/media?q=${encodeURIComponent(q.trim())}` : "/api/admin/media";
    dashboardApi
      .get<MediaAsset[]>(url)
      .then((d) => {
        setRows(d);
        setErr(null);
      })
      .catch((e) =>
        setErr(e instanceof DashboardApiError ? e.code : (e as Error).message),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Debounce search (server-side)
  useEffect(() => {
    const t = window.setTimeout(() => load(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const filtered = useMemo(
    () => (kindFilter ? rows.filter((r) => r.kind === kindFilter) : rows),
    [rows, kindFilter],
  );

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErr(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 16 * 1024 * 1024) {
          setErr(lang === "ar" ? "كل ملف ≤ ١٦ ميغابايت." : "Each file must be ≤ 16 MB.");
          continue;
        }
        await uploadDashboardFile(file, {
          register: true,
          title: file.name.replace(/\.[^.]+$/, ""),
        });
      }
      load(search);
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "UPLOAD_FAILED");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openEdit = (m: MediaAsset) => {
    setEditing(m);
    setEditTitle(m.title);
    setEditAltAr(m.altAr);
    setEditAltEn(m.altEn);
    setEditKind(m.kind);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: MediaUpdatePayload = {
        title: editTitle,
        altAr: editAltAr,
        altEn: editAltEn,
        kind: editKind,
      };
      await dashboardApi.patch(`/api/admin/media/${editing.id}`, payload);
      setEditing(null);
      load(search);
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (m: MediaAsset) => {
    const sure = window.confirm(
      lang === "ar"
        ? "حذف هذا الأصل من المكتبة؟ لن يُحذف الملف من السيرفر، لكن لن يظهر في المكتبة."
        : "Delete this asset from the library? The file remains on disk but won't show in the library.",
    );
    if (!sure) return;
    try {
      await dashboardApi.delete(`/api/admin/media/${m.id}`);
      load(search);
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : (e as Error).message);
    }
  };

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "مكتبة الوسائط" : "Media library"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "ارفع الصور والفيديو ونماذج 3D وأدر نصوصها البديلة."
              : "Upload images, video, and 3D assets; manage alt text and metadata."}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf,model/gltf-binary,model/gltf+json,.glb,.gltf"
          style={{ display: "none" }}
          onChange={(e) => handleUpload(e.target.files)}
        />
        <Button onClick={() => fileRef.current?.click()} loading={uploading}>
          + {lang === "ar" ? "رفع وسائط" : "Upload media"}
        </Button>
      </div>

      <Card tight>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 10,
            padding: 14,
            borderBottom: "1px solid var(--fz-border, #e5e7eb)",
          }}
        >
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث بالعنوان أو الرابط…" : "Search by title or URL…"}
          />
          <Select
            value={kindFilter}
            onChange={(e) => setKindFilter((e.target as HTMLSelectElement).value as "" | MediaKind)}
            options={[
              { value: "", label: lang === "ar" ? "كل الأنواع" : "All kinds" },
              { value: "image", label: lang === "ar" ? "صور" : "Images" },
              { value: "video", label: lang === "ar" ? "فيديو" : "Video" },
              { value: "model3d", label: lang === "ar" ? "نماذج ثلاثية" : "3D models" },
            ]}
          />
        </div>

        {loading ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div style={{ padding: 20, color: "var(--fz-danger)" }}>{err}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--fz-text-muted)" }}>
            {rows.length === 0
              ? lang === "ar"
                ? "لا وسائط بعد. ابدأ بالرفع."
                : "No media yet. Start by uploading."
              : lang === "ar"
                ? "لا نتائج مطابقة."
                : "No matches."}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
              padding: 14,
            }}
          >
            {filtered.map((m) => (
              <div
                key={m.id}
                style={{
                  border: "1px solid var(--fz-border, #e5e7eb)",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    aspectRatio: "1 / 1",
                    background: "var(--fz-bg-soft, #f1f5f9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {m.kind === "image" ? (
                    <img
                      src={resolveUrl(m.url)}
                      alt={m.altEn || m.title}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  ) : m.kind === "video" ? (
                    <span style={{ fontSize: 36 }}>🎬</span>
                  ) : (
                    <span style={{ fontSize: 36 }}>🧊</span>
                  )}
                </div>
                <div
                  style={{
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={m.title || m.url}
                  >
                    {m.title || m.url.split("/").pop()}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <Badge tone="info">{KIND_LABELS[m.kind][lang]}</Badge>
                    <span style={{ color: "var(--fz-text-muted)" }}>{formatBytes(m.fileSize, lang)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(m)}>
                      {lang === "ar" ? "تعديل" : "Edit"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(m.url);
                      }}
                      title={m.url}
                    >
                      {lang === "ar" ? "نسخ الرابط" : "Copy URL"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(m)}>
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={editing != null}
        onClose={() => setEditing(null)}
        title={lang === "ar" ? "تعديل بيانات الأصل" : "Edit asset"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={saveEdit} loading={saving}>
              {lang === "ar" ? "حفظ" : "Save"}
            </Button>
          </>
        }
      >
        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                background: "var(--fz-bg-soft, #f8fafc)",
                borderRadius: "var(--fz-radius)",
                padding: 16,
                minHeight: 120,
                alignItems: "center",
              }}
            >
              {editing.kind === "image" ? (
                <img
                  src={resolveUrl(editing.url)}
                  alt={editing.altEn}
                  style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain" }}
                />
              ) : (
                <span style={{ fontSize: 64 }}>
                  {editing.kind === "video" ? "🎬" : "🧊"}
                </span>
              )}
            </div>
            <Field label="URL">
              <Input value={editing.url} readOnly style={{ fontFamily: "monospace", fontSize: 12 }} />
            </Field>
            <Field label={lang === "ar" ? "النوع" : "Kind"}>
              <Select
                value={editKind}
                onChange={(e) => setEditKind((e.target as HTMLSelectElement).value as MediaKind)}
                options={[
                  { value: "image", label: KIND_LABELS.image[lang] },
                  { value: "video", label: KIND_LABELS.video[lang] },
                  { value: "model3d", label: KIND_LABELS.model3d[lang] },
                ]}
              />
            </Field>
            <Field label={lang === "ar" ? "العنوان" : "Title"}>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </Field>
            <Field label={lang === "ar" ? "النص البديل (عربي)" : "Alt text (Arabic)"}>
              <Input value={editAltAr} onChange={(e) => setEditAltAr(e.target.value)} />
            </Field>
            <Field label={lang === "ar" ? "النص البديل (إنجليزي)" : "Alt text (English)"}>
              <Input value={editAltEn} onChange={(e) => setEditAltEn(e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

export default DashboardMediaPage;
