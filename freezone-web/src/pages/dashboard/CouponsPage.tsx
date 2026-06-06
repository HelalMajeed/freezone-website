import { useEffect, useMemo, useState } from "react";
import {
  dashboardApi,
  type Coupon,
  type CouponDiscountType,
  type CouponPayload,
  type CouponUpdatePayload,
} from "@/lib/dashboard/api";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Table,
  useConfirm,
  useToast,
} from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";

type Lang = "ar" | "en";

type FormState = {
  id?: number;
  code: string;
  labelEn: string;
  labelAr: string;
  discountType: CouponDiscountType;
  discountValue: string;
  minSubtotal: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  active: boolean;
};

const EMPTY: FormState = {
  code: "",
  labelEn: "",
  labelAr: "",
  discountType: "percent",
  discountValue: "10",
  minSubtotal: "0",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  active: true,
};

function fromRow(c: Coupon): FormState {
  const toLocalDate = (iso: string | null) =>
    iso ? new Date(iso).toISOString().slice(0, 10) : "";
  return {
    id: c.id,
    code: c.code,
    labelEn: c.labelEn,
    labelAr: c.labelAr,
    discountType: c.discountType,
    discountValue: String(c.discountValue),
    minSubtotal: String(c.minSubtotal),
    startsAt: toLocalDate(c.startsAt),
    endsAt: toLocalDate(c.endsAt),
    usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
    active: c.active,
  };
}

function formatCurrency(amount: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-IQ", {
    style: "currency",
    currency: "IQD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function couponStatus(c: Coupon, now: Date): {
  tone: "neutral" | "success" | "warning" | "danger" | "info";
  enLabel: string;
  arLabel: string;
} {
  if (!c.active) return { tone: "neutral", enLabel: "Disabled", arLabel: "معطّل" };
  if (c.startsAt && new Date(c.startsAt) > now)
    return { tone: "warning", enLabel: "Scheduled", arLabel: "مجدول" };
  if (c.endsAt && new Date(c.endsAt) < now)
    return { tone: "danger", enLabel: "Expired", arLabel: "منتهي" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit)
    return { tone: "danger", enLabel: "Used up", arLabel: "مستنفد" };
  return { tone: "success", enLabel: "Active", arLabel: "ساري" };
}

export function DashboardCouponsPage() {
  const { lang, t, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();

  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const editing = form.id != null;

  const load = () => {
    setLoading(true);
    dashboardApi
      .get<Coupon[]>("/api/admin/coupons")
      .then((d) => {
        setRows(d);
        setErr(null);
      })
      .catch((e: unknown) => setErr(formatError(e)))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.labelEn.toLowerCase().includes(q) ||
        c.labelAr.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const openCreate = () => {
    setForm(EMPTY);
    setFormErr(null);
    setModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setForm(fromRow(c));
    setFormErr(null);
    setModalOpen(true);
  };

  const onSave = async () => {
    setFormErr(null);
    const code = form.code.trim().toUpperCase();
    if (!code) {
      setFormErr(lang === "ar" ? "الكود مطلوب." : "Code is required.");
      return;
    }
    const discountValue = Number(form.discountValue);
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      setFormErr(lang === "ar" ? "قيمة الخصم غير صالحة." : "Invalid discount value.");
      return;
    }
    if (form.discountType === "percent" && discountValue > 100) {
      setFormErr(lang === "ar" ? "النسبة لا يمكن أن تتجاوز ١٠٠." : "Percent can't exceed 100.");
      return;
    }
    const minSubtotal = Number(form.minSubtotal);
    const usageLimit = form.usageLimit ? Number(form.usageLimit) : null;

    setSaving(true);
    try {
      const payload: CouponPayload | CouponUpdatePayload = {
        code,
        labelEn: form.labelEn,
        labelAr: form.labelAr,
        discountType: form.discountType,
        discountValue,
        minSubtotal: Number.isFinite(minSubtotal) ? minSubtotal : 0,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt
          ? new Date(form.endsAt + "T23:59:59").toISOString()
          : null,
        usageLimit: usageLimit != null && Number.isFinite(usageLimit) ? usageLimit : null,
        active: form.active,
      };
      if (editing && form.id) {
        await dashboardApi.patch(`/api/admin/coupons/${form.id}`, payload);
      } else {
        await dashboardApi.post("/api/admin/coupons", payload);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setFormErr(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (c: Coupon) => {
    const sure = await confirm({
      title: t("coupons.deleteTitle"),
      message: t("coupons.deleteMessage", { code: c.code }),
      confirmLabel: t("confirm.delete"),
      tone: "danger",
    });
    if (!sure) return;
    try {
      await dashboardApi.delete(`/api/admin/coupons/${c.id}`);
      toast.success(t("coupons.deletedToast"));
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const onToggleActive = async (c: Coupon) => {
    try {
      await dashboardApi.patch(`/api/admin/coupons/${c.id}`, { active: !c.active });
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const now = new Date();

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "الكوبونات" : "Coupons"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "أنشئ أكواد خصم بنسبة مئوية أو مبلغ ثابت، مع نوافذ صلاحية وحدّ للاستعمال."
              : "Create percent or fixed-IQD discount codes with validity windows and usage caps."}
          </div>
        </div>
        <Button onClick={openCreate}>
          + {lang === "ar" ? "كوبون جديد" : "New coupon"}
        </Button>
      </div>

      <Card tight>
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--fz-border, #e5e7eb)",
          }}
        >
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث بالكود أو الوصف" : "Search by code or label"}
          />
        </div>

        {loading ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div style={{ padding: 20, color: "var(--fz-danger)" }}>{err}</div>
        ) : (
          <Table
            rowKey={(c) => c.id}
            rows={filtered}
            empty={
              rows.length === 0
                ? lang === "ar"
                  ? "لا كوبونات بعد. أنشئ أول كوبون."
                  : "No coupons yet. Create your first one."
                : lang === "ar"
                  ? "لا نتائج مطابقة."
                  : "No matches."
            }
            columns={[
              {
                header: lang === "ar" ? "الكود" : "Code",
                cell: (c) => (
                  <div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        letterSpacing: 0.5,
                      }}
                    >
                      {c.code}
                    </div>
                    {(lang === "ar" ? c.labelAr : c.labelEn) && (
                      <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
                        {lang === "ar" ? c.labelAr : c.labelEn}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: lang === "ar" ? "الخصم" : "Discount",
                cell: (c) => (
                  <span style={{ fontWeight: 600 }}>
                    {c.discountType === "percent"
                      ? `${c.discountValue}%`
                      : formatCurrency(c.discountValue, lang)}
                  </span>
                ),
              },
              {
                header: lang === "ar" ? "حد أدنى" : "Min subtotal",
                cell: (c) =>
                  c.minSubtotal > 0 ? (
                    <span>{formatCurrency(c.minSubtotal, lang)}</span>
                  ) : (
                    <span style={{ color: "var(--fz-text-muted)" }}>—</span>
                  ),
              },
              {
                header: lang === "ar" ? "الصلاحية" : "Validity",
                cell: (c) => {
                  const fmt = (iso: string | null) =>
                    iso
                      ? new Date(iso).toLocaleDateString(lang === "ar" ? "ar-IQ" : "en-GB")
                      : "—";
                  return (
                    <div style={{ fontSize: 12, color: "var(--fz-text-soft)" }}>
                      <div>{lang === "ar" ? "من: " : "From: "}{fmt(c.startsAt)}</div>
                      <div>{lang === "ar" ? "إلى: " : "To: "}{fmt(c.endsAt)}</div>
                    </div>
                  );
                },
              },
              {
                header: lang === "ar" ? "الاستعمال" : "Usage",
                width: "100px",
                cell: (c) => (
                  <span>
                    {c.usedCount}
                    {c.usageLimit != null && (
                      <span style={{ color: "var(--fz-text-muted)" }}>/{c.usageLimit}</span>
                    )}
                  </span>
                ),
              },
              {
                header: lang === "ar" ? "الحالة" : "Status",
                width: "100px",
                cell: (c) => {
                  const s = couponStatus(c, now);
                  return (
                    <Badge tone={s.tone}>{lang === "ar" ? s.arLabel : s.enLabel}</Badge>
                  );
                },
              },
              {
                header: "",
                cell: (c) => (
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <Button size="sm" variant="secondary" onClick={() => onToggleActive(c)}>
                      {c.active
                        ? lang === "ar" ? "تعطيل" : "Disable"
                        : lang === "ar" ? "تفعيل" : "Enable"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>
                      {lang === "ar" ? "تعديل" : "Edit"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(c)}>
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
            ? lang === "ar" ? "تعديل الكوبون" : "Edit coupon"
            : lang === "ar" ? "كوبون جديد" : "New coupon"
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
            label={lang === "ar" ? "الكود" : "Code"}
            hint={lang === "ar" ? "سيُحوَّل تلقائياً للأحرف الكبيرة." : "Auto-uppercased on save."}
          >
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="SUMMER20"
              style={{ fontFamily: "monospace", letterSpacing: 0.5 }}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label={lang === "ar" ? "الوصف بالعربية" : "Label (Arabic)"}>
              <Input
                value={form.labelAr}
                onChange={(e) => setForm({ ...form, labelAr: e.target.value })}
              />
            </Field>
            <Field label={lang === "ar" ? "الوصف بالإنجليزية" : "Label (English)"}>
              <Input
                value={form.labelEn}
                onChange={(e) => setForm({ ...form, labelEn: e.target.value })}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label={lang === "ar" ? "نوع الخصم" : "Discount type"}>
              <Select
                value={form.discountType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discountType: (e.target as HTMLSelectElement).value as CouponDiscountType,
                  })
                }
                options={[
                  { value: "percent", label: lang === "ar" ? "نسبة مئوية ٪" : "Percent (%)" },
                  { value: "fixed_iqd", label: lang === "ar" ? "مبلغ ثابت (د.ع)" : "Fixed IQD" },
                ]}
              />
            </Field>
            <Field
              label={lang === "ar" ? "قيمة الخصم" : "Discount value"}
              hint={
                form.discountType === "percent"
                  ? lang === "ar" ? "بين 0 و 100." : "Between 0 and 100."
                  : lang === "ar" ? "بالدينار." : "In IQD."
              }
            >
              <Input
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label={lang === "ar" ? "حد أدنى للسلة" : "Minimum subtotal (IQD)"}
            hint={lang === "ar" ? "اختياري. صفر = بلا حد." : "Optional. Zero = no minimum."}
          >
            <Input
              type="number"
              value={form.minSubtotal}
              onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label={lang === "ar" ? "يبدأ" : "Starts"}>
              <Input
                type="date"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </Field>
            <Field label={lang === "ar" ? "ينتهي" : "Ends"}>
              <Input
                type="date"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label={lang === "ar" ? "حد الاستعمال" : "Usage limit"}
            hint={lang === "ar" ? "اختياري. اتركه فارغاً لبلا حد." : "Optional. Blank = unlimited."}
          >
            <Input
              type="number"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            />
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
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <span>{lang === "ar" ? "نشط" : "Active"}</span>
          </label>
        </div>
      </Modal>
    </>
  );
}

export default DashboardCouponsPage;
