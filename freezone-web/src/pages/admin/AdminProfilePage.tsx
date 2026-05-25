import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { dashboardApi, DashboardApiError } from "@/lib/dashboard/api";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { Avatar, Badge, Button, Card, Field, Input } from "@/components/dashboard/ui";

const ROLE_LABELS_AR: Record<string, string> = {
  SUPER_ADMIN: "مدير عام",
  CATALOG_MANAGER: "مدير كتالوج",
  CATALOG_EDITOR: "محرّر كتالوج",
};

export function DashboardProfilePage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";
  const user = useDashboardAuth((s) => s.user);
  const logout = useDashboardAuth((s) => s.logout);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (next.length < 8) {
      setErr(lang === "ar" ? "٨ أحرف على الأقل." : "At least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setErr(lang === "ar" ? "كلمتا المرور غير متطابقتين." : "Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await dashboardApi.post("/api/dashboard/auth/change-password", {
        currentPassword: current,
        newPassword: next,
      });
      // success: server has revoked all sessions including this one
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (e) {
      if (e instanceof DashboardApiError) {
        setErr(
          e.code === "INVALID_CURRENT_PASSWORD"
            ? lang === "ar"
              ? "كلمة المرور الحالية غير صحيحة."
              : "Current password is wrong."
            : e.code,
        );
      } else {
        setErr("UNKNOWN");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "حسابي" : "My profile"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "بيانات حسابك وإدارة كلمة المرور."
              : "Your account info and password management."}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card title={lang === "ar" ? "البيانات" : "Account info"}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
            <Avatar name={user.name} url={user.avatarUrl} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
              <div style={{ fontSize: 13, color: "var(--fz-text-muted)" }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--fz-text-soft)", fontWeight: 600 }}>
              {lang === "ar" ? "الصلاحية:" : "Role:"}
            </span>
            <Badge tone="brand">
              {lang === "ar" ? ROLE_LABELS_AR[user.role] ?? user.role : user.role}
            </Badge>
          </div>
        </Card>

        <Card title={lang === "ar" ? "تغيير كلمة المرور" : "Change password"}>
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

            <Field label={lang === "ar" ? "كلمة المرور الحالية" : "Current password"}>
              <Input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label={lang === "ar" ? "كلمة مرور جديدة" : "New password"}>
              <Input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label={lang === "ar" ? "تأكيد كلمة المرور الجديدة" : "Confirm new password"}>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </Field>

            <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
              {lang === "ar"
                ? "عند الحفظ ستُنهى جميع جلساتك وتحتاج لتسجيل الدخول مجدداً."
                : "All your sessions will end after saving — you'll need to log in again."}
            </div>

            <Button type="submit" loading={submitting}>
              {lang === "ar" ? "تحديث كلمة المرور" : "Update password"}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}

export default DashboardProfilePage;
