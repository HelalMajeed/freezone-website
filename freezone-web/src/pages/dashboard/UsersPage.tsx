import { useEffect, useState } from "react";
import {
  dashboardApi,
  type DashboardUserDetail,
  type Role,
} from "@/lib/dashboard/api";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import {
  Avatar,
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

const ROLE_LABELS: Record<Role, { en: string; ar: string }> = {
  SUPER_ADMIN: { en: "Super admin", ar: "مدير عام" },
  CATALOG_MANAGER: { en: "Catalog manager", ar: "مدير كتالوج" },
  CATALOG_EDITOR: { en: "Catalog editor", ar: "محرّر كتالوج" },
};

const ROLE_TONE: Record<Role, "brand" | "info" | "neutral" | "warning"> = {
  SUPER_ADMIN: "brand",
  CATALOG_MANAGER: "info",
  CATALOG_EDITOR: "neutral",
};

type UserFormState = {
  id?: number;
  email: string;
  name: string;
  password: string;
  role: Role;
  active: boolean;
};

const EMPTY_FORM: UserFormState = {
  email: "",
  name: "",
  password: "",
  role: "CATALOG_EDITOR",
  active: true,
};

export function DashboardUsersPage() {
  const { lang, t, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const currentUser = useDashboardAuth((s) => s.user);

  const [users, setUsers] = useState<DashboardUserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const editing = form.id != null;

  const load = () => {
    setLoading(true);
    dashboardApi
      .get<{ users: DashboardUserDetail[] }>("/api/dashboard/users")
      .then((d) => {
        setUsers(d.users);
        setErr(null);
      })
      .catch((e: unknown) => setErr(formatError(e)))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  useEffect(load, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErr(null);
    setModalOpen(true);
  };

  const openEdit = (u: DashboardUserDetail) => {
    setForm({
      id: u.id,
      email: u.email,
      name: u.name,
      password: "",
      role: u.role,
      active: u.active,
    });
    setFormErr(null);
    setModalOpen(true);
  };

  const onSave = async () => {
    setSaving(true);
    setFormErr(null);
    try {
      if (editing && form.id) {
        const payload: Record<string, unknown> = {
          name: form.name,
          role: form.role,
          active: form.active,
        };
        if (form.password) payload.password = form.password;
        await dashboardApi.patch(`/api/dashboard/users/${form.id}`, payload);
      } else {
        await dashboardApi.post("/api/dashboard/users", {
          email: form.email,
          name: form.name,
          password: form.password,
          role: form.role,
        });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setFormErr(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (u: DashboardUserDetail) => {
    if (u.id === currentUser?.id) {
      toast.error(t("users.deleteSelf"));
      return;
    }
    const sure = await confirm({
      title: t("users.deleteTitle"),
      message: t("users.deleteMessage", { name: u.name }),
      confirmLabel: t("confirm.delete"),
      tone: "danger",
    });
    if (!sure) return;
    try {
      await dashboardApi.delete(`/api/dashboard/users/${u.id}`);
      toast.success(t("users.deletedToast"));
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const onUnlock = async (u: DashboardUserDetail) => {
    try {
      await dashboardApi.patch(`/api/dashboard/users/${u.id}`, { unlock: true });
      toast.success(t("users.unlockedToast"));
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "الفريق والصلاحيات" : "Team & roles"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "أنشئ حسابات وأدوار للأشخاص الذين يديرون الموقع."
              : "Create accounts and assign roles for the people running the site."}
          </div>
        </div>
        <Button onClick={openCreate}>
          + {lang === "ar" ? "إضافة عضو" : "Add member"}
        </Button>
      </div>

      <Card tight>
        {loading ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div style={{ padding: 20, color: "var(--fz-danger)" }}>{err}</div>
        ) : (
          <Table
            rowKey={(u) => u.id}
            rows={users}
            empty={lang === "ar" ? "لا أعضاء" : "No members"}
            columns={[
              {
                header: lang === "ar" ? "العضو" : "Member",
                cell: (u) => (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={u.name} url={u.avatarUrl} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>{u.email}</div>
                    </div>
                  </div>
                ),
              },
              {
                header: lang === "ar" ? "الصلاحية" : "Role",
                cell: (u) => <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role][lang]}</Badge>,
              },
              {
                header: lang === "ar" ? "الحالة" : "Status",
                cell: (u) => {
                  const locked =
                    u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now();
                  if (locked) return <Badge tone="danger">{lang === "ar" ? "مقفل" : "Locked"}</Badge>;
                  return u.active ? (
                    <Badge tone="success">{lang === "ar" ? "نشط" : "Active"}</Badge>
                  ) : (
                    <Badge tone="neutral">{lang === "ar" ? "معطّل" : "Disabled"}</Badge>
                  );
                },
              },
              {
                header: lang === "ar" ? "آخر دخول" : "Last login",
                cell: (u) =>
                  u.lastLoginAt ? (
                    new Date(u.lastLoginAt).toLocaleString(lang === "ar" ? "ar-IQ" : "en-GB")
                  ) : (
                    <span style={{ color: "var(--fz-text-muted)" }}>—</span>
                  ),
              },
              {
                header: "",
                cell: (u) => {
                  const locked =
                    u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now();
                  return (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {locked && (
                        <Button size="sm" variant="secondary" onClick={() => onUnlock(u)}>
                          {lang === "ar" ? "فكّ القفل" : "Unlock"}
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>
                        {lang === "ar" ? "تعديل" : "Edit"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(u)}>
                        ✕
                      </Button>
                    </div>
                  );
                },
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
            ? lang === "ar"
              ? "تعديل العضو"
              : "Edit member"
            : lang === "ar"
              ? "إضافة عضو جديد"
              : "Add new member"
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

          <Field label={lang === "ar" ? "الاسم" : "Full name"}>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={lang === "ar" ? "علي محمد" : "Jane Doe"}
            />
          </Field>

          <Field label={lang === "ar" ? "البريد الإلكتروني" : "Email"}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={editing}
              placeholder="jane@freezone-iq.com"
            />
          </Field>

          <Field
            label={
              editing
                ? lang === "ar"
                  ? "كلمة مرور جديدة (اختياري)"
                  : "New password (optional)"
                : lang === "ar"
                  ? "كلمة المرور"
                  : "Password"
            }
            hint={
              editing
                ? lang === "ar"
                  ? "اتركها فارغة للإبقاء على الحالية. عند التغيير ستُنهى جميع الجلسات."
                  : "Leave blank to keep current. Changing it ends all sessions."
                : lang === "ar"
                  ? "٨ أحرف على الأقل."
                  : "At least 8 characters."
            }
          >
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>

          <Field label={lang === "ar" ? "الصلاحية" : "Role"}>
            <Select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: (e.target as HTMLSelectElement).value as Role })
              }
              options={(["CATALOG_EDITOR", "CATALOG_MANAGER", "SUPER_ADMIN"] as Role[]).map((r) => ({
                value: r,
                label: ROLE_LABELS[r][lang],
              }))}
            />
          </Field>

          {editing && (
            <Field label={lang === "ar" ? "نشط" : "Active"}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span style={{ fontSize: 13, color: "var(--fz-text-soft)" }}>
                  {lang === "ar"
                    ? "إيقاف الحساب يمنع تسجيل الدخول وينهي الجلسات."
                    : "Disabling blocks login and ends sessions."}
                </span>
              </label>
            </Field>
          )}
        </div>
      </Modal>
    </>
  );
}

export default DashboardUsersPage;
