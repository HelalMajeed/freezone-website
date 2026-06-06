import { useEffect, useState } from "react";
import {
  dashboardApi,
  type TrustBarItem,
  type TrustBarItemPayload,
} from "@/lib/dashboard/api";
import {
  Button,
  Field,
  Input,
  Modal,
  Table,
  useConfirm,
  useToast,
} from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";

type Lang = "ar" | "en";

type FormState = {
  id?: number;
  textEn: string;
  textAr: string;
  iconKey: string;
  sortOrder: string;
};

const EMPTY: FormState = { textEn: "", textAr: "", iconKey: "truck", sortOrder: "0" };

export function TrustBarTab({ lang }: { lang: Lang }) {
  const { t, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<TrustBarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const editing = form.id != null;

  const load = () => {
    setLoading(true);
    dashboardApi
      .get<TrustBarItem[]>("/api/admin/trust-bar")
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
  const openEdit = (r: TrustBarItem) => {
    setForm({
      id: r.id,
      textEn: r.textEn,
      textAr: r.textAr,
      iconKey: r.iconKey,
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
      const payload: TrustBarItemPayload = {
        textEn: form.textEn.trim(),
        textAr: form.textAr.trim() || form.textEn.trim(),
        iconKey: form.iconKey.trim() || "truck",
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing && form.id) {
        await dashboardApi.patch(`/api/admin/trust-bar/${form.id}`, payload);
      } else {
        await dashboardApi.post("/api/admin/trust-bar", payload);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (r: TrustBarItem) => {
    const sure = await confirm({
      title: t("cms.deleteItemTitle"),
      message: t("cms.deleteMessage"),
      confirmLabel: t("confirm.delete"),
      tone: "danger",
    });
    if (!sure) return;
    try {
      await dashboardApi.delete(`/api/admin/trust-bar/${r.id}`);
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
            ? "عناصر شريط الثقة تحت الـ Hero (شحن، ضمان، الدفع عند الاستلام…)."
            : "Trust bar items under the hero (shipping, warranty, COD…)."}
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
              header: lang === "ar" ? "الأيقونة" : "Icon",
              width: "80px",
              cell: (r) => (
                <span style={{ fontFamily: "monospace", fontSize: 12 }}>{r.iconKey}</span>
              ),
            },
            {
              header: lang === "ar" ? "النص" : "Text",
              cell: (r) => (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {lang === "ar" ? r.textAr || r.textEn : r.textEn}
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
            <Field label={lang === "ar" ? "النص (إنجليزي)" : "Text (English)"}>
              <Input value={form.textEn} onChange={(e) => setForm({ ...form, textEn: e.target.value })} />
            </Field>
            <Field label={lang === "ar" ? "النص (عربي)" : "Text (Arabic)"}>
              <Input value={form.textAr} onChange={(e) => setForm({ ...form, textAr: e.target.value })} />
            </Field>
          </div>
          <Field
            label={lang === "ar" ? "أيقونة Lucide" : "Lucide icon key"}
            hint={lang === "ar" ? "مثل truck, shield-check, credit-card." : "e.g. truck, shield-check, credit-card."}
          >
            <Input value={form.iconKey} onChange={(e) => setForm({ ...form, iconKey: e.target.value })} />
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
