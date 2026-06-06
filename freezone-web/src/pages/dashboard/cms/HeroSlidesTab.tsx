import { useEffect, useRef, useState } from "react";
import {
  dashboardApi,
  uploadDashboardFile,
  type HeroSlide,
  type HeroSlidePayload,
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
  useConfirm,
  useToast,
} from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";

type Lang = "ar" | "en";

type FormState = {
  id?: number;
  badgeEn: string;
  badgeAr: string;
  titleLine1En: string;
  titleLine1Ar: string;
  titleLine2En: string;
  titleLine2Ar: string;
  descEn: string;
  descAr: string;
  imageUrl: string;
  primaryLabelEn: string;
  primaryLabelAr: string;
  primaryHref: string;
  secondaryLabelEn: string;
  secondaryLabelAr: string;
  secondaryHref: string;
  sortOrder: string;
  active: boolean;
};

const EMPTY: FormState = {
  badgeEn: "",
  badgeAr: "",
  titleLine1En: "",
  titleLine1Ar: "",
  titleLine2En: "",
  titleLine2Ar: "",
  descEn: "",
  descAr: "",
  imageUrl: "",
  primaryLabelEn: "",
  primaryLabelAr: "",
  primaryHref: "/products",
  secondaryLabelEn: "",
  secondaryLabelAr: "",
  secondaryHref: "/contact",
  sortOrder: "0",
  active: true,
};

function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

function fromRow(s: HeroSlide): FormState {
  return {
    id: s.id,
    badgeEn: s.badgeEn,
    badgeAr: s.badgeAr,
    titleLine1En: s.titleLine1En,
    titleLine1Ar: s.titleLine1Ar,
    titleLine2En: s.titleLine2En,
    titleLine2Ar: s.titleLine2Ar,
    descEn: s.descEn,
    descAr: s.descAr,
    imageUrl: s.imageUrl,
    primaryLabelEn: s.primaryLabelEn,
    primaryLabelAr: s.primaryLabelAr,
    primaryHref: s.primaryHref,
    secondaryLabelEn: s.secondaryLabelEn,
    secondaryLabelAr: s.secondaryLabelAr,
    secondaryHref: s.secondaryHref,
    sortOrder: String(s.sortOrder),
    active: s.active,
  };
}

export function HeroSlidesTab({ lang }: { lang: Lang }) {
  const { t, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<HeroSlide[]>([]);
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
      .get<HeroSlide[]>("/api/admin/hero-slides")
      .then((d) => {
        setRows(d);
        setErr(null);
      })
      .catch((e: unknown) => setErr(formatError(e)))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  useEffect(load, []);

  const openCreate = () => {
    setForm(EMPTY);
    setErr(null);
    setModalOpen(true);
  };
  const openEdit = (r: HeroSlide) => {
    setForm(fromRow(r));
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
        title: form.titleLine1En || "Hero slide",
      });
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    setErr(null);
    if (!form.imageUrl.trim()) {
      setErr(lang === "ar" ? "صورة الـ Hero مطلوبة." : "Hero image is required.");
      return;
    }
    setSaving(true);
    try {
      const payload: HeroSlidePayload = {
        badgeEn: form.badgeEn,
        badgeAr: form.badgeAr,
        titleLine1En: form.titleLine1En,
        titleLine1Ar: form.titleLine1Ar,
        titleLine2En: form.titleLine2En,
        titleLine2Ar: form.titleLine2Ar,
        descEn: form.descEn,
        descAr: form.descAr,
        imageUrl: form.imageUrl.trim(),
        primaryLabelEn: form.primaryLabelEn,
        primaryLabelAr: form.primaryLabelAr,
        primaryHref: form.primaryHref.trim() || "/products",
        secondaryLabelEn: form.secondaryLabelEn,
        secondaryLabelAr: form.secondaryLabelAr,
        secondaryHref: form.secondaryHref.trim() || "/contact",
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
      };
      if (editing && form.id) {
        await dashboardApi.patch(`/api/admin/hero-slides/${form.id}`, payload);
      } else {
        await dashboardApi.post("/api/admin/hero-slides", payload);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (r: HeroSlide) => {
    const sure = await confirm({
      title: t("cms.deleteSlideTitle"),
      message: t("cms.deleteMessage"),
      confirmLabel: t("confirm.delete"),
      tone: "danger",
    });
    if (!sure) return;
    try {
      await dashboardApi.delete(`/api/admin/hero-slides/${r.id}`);
      toast.success(t("cms.deletedToast"));
      load();
    } catch (e) {
      toast.error(formatError(e));
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
            ? "شرائح Hero في أعلى الصفحة الرئيسية (الوضع المهيكل: شارة، عنوانان، وصف، زرّان)."
            : "Top hero slides on the homepage (structured mode: badge, two-line title, description, two CTAs)."}
        </div>
        <Button size="sm" onClick={openCreate}>
          + {lang === "ar" ? "شريحة جديدة" : "New slide"}
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
          empty={lang === "ar" ? "لا شرائح بعد." : "No slides yet."}
          columns={[
            {
              header: "",
              width: "100px",
              cell: (r) => (
                <span
                  style={{
                    display: "inline-flex",
                    width: 80,
                    height: 48,
                    background: "var(--fz-bg-soft, #f1f5f9)",
                    border: "1px solid var(--fz-border, #e5e7eb)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  {r.imageUrl && (
                    <img
                      src={resolveImage(r.imageUrl)}
                      alt=""
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
                  {r.badgeEn || r.badgeAr ? (
                    <Badge tone="info">{lang === "ar" ? r.badgeAr || r.badgeEn : r.badgeEn}</Badge>
                  ) : null}
                  <div style={{ fontWeight: 600, marginTop: 4 }}>
                    {lang === "ar"
                      ? `${r.titleLine1Ar || r.titleLine1En} ${r.titleLine2Ar || r.titleLine2En}`.trim() || "—"
                      : `${r.titleLine1En} ${r.titleLine2En}`.trim() || "—"}
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
        size="lg"
        title={editing ? (lang === "ar" ? "تعديل الشريحة" : "Edit slide") : lang === "ar" ? "شريحة جديدة" : "New slide"}
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
          <Field label={lang === "ar" ? "صورة الـ Hero" : "Hero image"}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span
                style={{
                  display: "inline-flex",
                  width: 140,
                  height: 80,
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
            <Field label={lang === "ar" ? "شارة (إنجليزي)" : "Badge (English)"}>
              <Input value={form.badgeEn} onChange={(e) => setForm({ ...form, badgeEn: e.target.value })} />
            </Field>
            <Field label={lang === "ar" ? "شارة (عربي)" : "Badge (Arabic)"}>
              <Input value={form.badgeAr} onChange={(e) => setForm({ ...form, badgeAr: e.target.value })} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label={lang === "ar" ? "السطر ١ (إنجليزي)" : "Title line 1 (English)"}>
              <Input
                value={form.titleLine1En}
                onChange={(e) => setForm({ ...form, titleLine1En: e.target.value })}
              />
            </Field>
            <Field label={lang === "ar" ? "السطر ١ (عربي)" : "Title line 1 (Arabic)"}>
              <Input
                value={form.titleLine1Ar}
                onChange={(e) => setForm({ ...form, titleLine1Ar: e.target.value })}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label={lang === "ar" ? "السطر ٢ (إنجليزي)" : "Title line 2 (English)"}>
              <Input
                value={form.titleLine2En}
                onChange={(e) => setForm({ ...form, titleLine2En: e.target.value })}
              />
            </Field>
            <Field label={lang === "ar" ? "السطر ٢ (عربي)" : "Title line 2 (Arabic)"}>
              <Input
                value={form.titleLine2Ar}
                onChange={(e) => setForm({ ...form, titleLine2Ar: e.target.value })}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label={lang === "ar" ? "الوصف (إنجليزي)" : "Description (English)"}>
              <Textarea
                rows={2}
                value={form.descEn}
                onChange={(e) => setForm({ ...form, descEn: e.target.value })}
              />
            </Field>
            <Field label={lang === "ar" ? "الوصف (عربي)" : "Description (Arabic)"}>
              <Textarea
                rows={2}
                value={form.descAr}
                onChange={(e) => setForm({ ...form, descAr: e.target.value })}
              />
            </Field>
          </div>

          <div
            style={{
              padding: 14,
              background: "var(--fz-bg-soft, #f8fafc)",
              borderRadius: "var(--fz-radius)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {lang === "ar" ? "الزر الأساسي" : "Primary button"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 10 }}>
              <Field label={lang === "ar" ? "نص (إنجليزي)" : "Label (English)"}>
                <Input
                  value={form.primaryLabelEn}
                  onChange={(e) => setForm({ ...form, primaryLabelEn: e.target.value })}
                />
              </Field>
              <Field label={lang === "ar" ? "نص (عربي)" : "Label (Arabic)"}>
                <Input
                  value={form.primaryLabelAr}
                  onChange={(e) => setForm({ ...form, primaryLabelAr: e.target.value })}
                />
              </Field>
              <Field label={lang === "ar" ? "الرابط" : "Link"}>
                <Input
                  value={form.primaryHref}
                  onChange={(e) => setForm({ ...form, primaryHref: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <div
            style={{
              padding: 14,
              background: "var(--fz-bg-soft, #f8fafc)",
              borderRadius: "var(--fz-radius)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {lang === "ar" ? "الزر الثانوي" : "Secondary button"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 10 }}>
              <Field label={lang === "ar" ? "نص (إنجليزي)" : "Label (English)"}>
                <Input
                  value={form.secondaryLabelEn}
                  onChange={(e) => setForm({ ...form, secondaryLabelEn: e.target.value })}
                />
              </Field>
              <Field label={lang === "ar" ? "نص (عربي)" : "Label (Arabic)"}>
                <Input
                  value={form.secondaryLabelAr}
                  onChange={(e) => setForm({ ...form, secondaryLabelAr: e.target.value })}
                />
              </Field>
              <Field label={lang === "ar" ? "الرابط" : "Link"}>
                <Input
                  value={form.secondaryHref}
                  onChange={(e) => setForm({ ...form, secondaryHref: e.target.value })}
                />
              </Field>
            </div>
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
