import { useEffect, useState } from "react";
import {
  dashboardApi,
  DashboardApiError,
  type SocialLink,
  type SocialLinkPayload,
} from "@/lib/dashboard/api";
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
  platform: string;
  url: string;
  sortOrder: string;
  showInTopBar: boolean;
};

const EMPTY: FormState = {
  platform: "",
  url: "",
  sortOrder: "0",
  showInTopBar: true,
};

export function SocialLinksTab({ lang }: { lang: Lang }) {
  const [rows, setRows] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const editing = form.id != null;

  const load = () => {
    setLoading(true);
    dashboardApi
      .get<SocialLink[]>("/api/admin/social-links")
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
  const openEdit = (r: SocialLink) => {
    setForm({
      id: r.id,
      platform: r.platform,
      url: r.url,
      sortOrder: String(r.sortOrder),
      showInTopBar: r.showInTopBar,
    });
    setErr(null);
    setModalOpen(true);
  };

  const onSave = async () => {
    setErr(null);
    if (!form.platform.trim() || !form.url.trim()) {
      setErr(lang === "ar" ? "المنصة والرابط مطلوبان." : "Platform and URL are required.");
      return;
    }
    setSaving(true);
    try {
      const payload: SocialLinkPayload = {
        platform: form.platform.trim().toLowerCase(),
        url: form.url.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        showInTopBar: form.showInTopBar,
      };
      if (editing && form.id) {
        await dashboardApi.patch(`/api/admin/social-links/${form.id}`, payload);
      } else {
        await dashboardApi.post("/api/admin/social-links", payload);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "SAVE_FAILED");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (r: SocialLink) => {
    if (!window.confirm(lang === "ar" ? `حذف رابط ${r.platform}؟` : `Delete ${r.platform} link?`)) return;
    try {
      await dashboardApi.delete(`/api/admin/social-links/${r.id}`);
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
            ? "روابط الشبكات الاجتماعية (الفوتر والشريط العلوي)."
            : "Social network links (footer + top bar)."}
        </div>
        <Button size="sm" onClick={openCreate}>
          + {lang === "ar" ? "رابط جديد" : "New link"}
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
          empty={lang === "ar" ? "لا روابط بعد." : "No links yet."}
          columns={[
            {
              header: lang === "ar" ? "المنصة" : "Platform",
              cell: (r) => (
                <span style={{ fontFamily: "monospace", fontWeight: 600, textTransform: "capitalize" }}>
                  {r.platform}
                </span>
              ),
            },
            {
              header: "URL",
              cell: (r) => (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--fz-brand, #2563eb)", fontSize: 13 }}
                >
                  {r.url}
                </a>
              ),
            },
            {
              header: lang === "ar" ? "الترتيب" : "Sort",
              width: "80px",
              cell: (r) => <span style={{ color: "var(--fz-text-soft)" }}>{r.sortOrder}</span>,
            },
            {
              header: lang === "ar" ? "الشريط العلوي" : "Top bar",
              width: "110px",
              cell: (r) =>
                r.showInTopBar ? (
                  <Badge tone="success">{lang === "ar" ? "نعم" : "Yes"}</Badge>
                ) : (
                  <Badge tone="neutral">{lang === "ar" ? "لا" : "No"}</Badge>
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
        title={editing ? (lang === "ar" ? "تعديل الرابط" : "Edit link") : lang === "ar" ? "رابط جديد" : "New link"}
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
          <Field
            label={lang === "ar" ? "المنصة" : "Platform"}
            hint={lang === "ar" ? "مثل instagram, facebook, twitter, tiktok." : "e.g. instagram, facebook, twitter, tiktok."}
          >
            <Input
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              placeholder="instagram"
            />
          </Field>
          <Field label="URL">
            <Input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://instagram.com/freezone"
            />
          </Field>
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
              checked={form.showInTopBar}
              onChange={(e) => setForm({ ...form, showInTopBar: e.target.checked })}
            />
            <span>{lang === "ar" ? "إظهار في الشريط العلوي (إضافة إلى الفوتر)" : "Show in top bar (in addition to footer)"}</span>
          </label>
        </div>
      </Modal>
    </>
  );
}
