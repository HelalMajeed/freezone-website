import { useEffect, useState } from "react";
import {
  dashboardApi,
  DashboardApiError,
  type TickerItem,
  type TickerItemPayload,
} from "@/lib/dashboard/api";
import {
  Button,
  Field,
  Input,
  Modal,
  Table,
} from "@/components/dashboard/ui";

type Lang = "ar" | "en";

type FormState = {
  id?: number;
  textEn: string;
  textAr: string;
  iconSuffix: string;
  sortOrder: string;
};

const EMPTY: FormState = { textEn: "", textAr: "", iconSuffix: "", sortOrder: "0" };

export function TickerTab({ lang }: { lang: Lang }) {
  const [rows, setRows] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const editing = form.id != null;

  const load = () => {
    setLoading(true);
    dashboardApi
      .get<TickerItem[]>("/api/admin/ticker")
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
  const openEdit = (r: TickerItem) => {
    setForm({
      id: r.id,
      textEn: r.textEn,
      textAr: r.textAr,
      iconSuffix: r.iconSuffix ?? "",
      sortOrder: String(r.sortOrder),
    });
    setErr(null);
    setModalOpen(true);
  };

  const onSave = async () => {
    setErr(null);
    if (!form.textEn.trim()) {
      setErr(lang === "ar" ? "النص بالإنجليزية مطلوب." : "Text (English) is required.");
      return;
    }
    setSaving(true);
    try {
      const payload: TickerItemPayload = {
        textEn: form.textEn.trim(),
        textAr: form.textAr.trim() || form.textEn.trim(),
        iconSuffix: form.iconSuffix.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing && form.id) {
        await dashboardApi.patch(`/api/admin/ticker/${form.id}`, payload);
      } else {
        await dashboardApi.post("/api/admin/ticker", payload);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "SAVE_FAILED");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (r: TickerItem) => {
    if (!window.confirm(lang === "ar" ? "حذف العنصر؟" : "Delete this item?")) return;
    try {
      await dashboardApi.delete(`/api/admin/ticker/${r.id}`);
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
            ? "عناصر الشريط المتحرك في الصفحة الرئيسية (تحت Hero)."
            : "Marquee ticker items on the homepage (below the hero)."}
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
              header: lang === "ar" ? "النص" : "Text",
              cell: (r) => (
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {lang === "ar" ? r.textAr || r.textEn : r.textEn}
                    {r.iconSuffix && <span style={{ marginInlineStart: 6 }}>{r.iconSuffix}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
                    {lang === "ar" ? r.textEn : r.textAr}
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
        title={editing ? (lang === "ar" ? "تعديل" : "Edit") : lang === "ar" ? "عنصر جديد" : "New item"}
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
            <Field label={lang === "ar" ? "النص (إنجليزي)" : "Text (English)"}>
              <Input value={form.textEn} onChange={(e) => setForm({ ...form, textEn: e.target.value })} />
            </Field>
            <Field label={lang === "ar" ? "النص (عربي)" : "Text (Arabic)"}>
              <Input value={form.textAr} onChange={(e) => setForm({ ...form, textAr: e.target.value })} />
            </Field>
          </div>
          <Field
            label={lang === "ar" ? "إيموجي/أيقونة لاحقة" : "Trailing emoji / icon"}
            hint={lang === "ar" ? "مثل 🚚 — اختياري." : "e.g. 🚚 — optional."}
          >
            <Input value={form.iconSuffix} onChange={(e) => setForm({ ...form, iconSuffix: e.target.value })} />
          </Field>
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
