import { useTranslation } from "react-i18next";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { Avatar, Badge, Card } from "@/components/dashboard/ui";

const ROLE_LABELS_AR: Record<string, string> = {
  SUPER_ADMIN: "مدير عام",
  CATALOG_MANAGER: "مدير كتالوج",
  CATALOG_EDITOR: "محرّر كتالوج",
};

export function DashboardProfilePage() {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";
  const user = useDashboardAuth((s) => s.user);

  if (!user) return null;

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "حسابي" : "My profile"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "بيانات حسابك وصلاحياتك في لوحة التحكم."
              : "Your account info and dashboard role."}
          </div>
        </div>
      </div>

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
    </>
  );
}

export default DashboardProfilePage;
