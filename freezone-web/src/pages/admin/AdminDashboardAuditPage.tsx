import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { dashboardApi, type AuditEntry } from "@/lib/dashboard/api";
import { Badge, Button, Card } from "@/components/dashboard/ui";
import ui from "@/components/dashboard/ui/ui.module.css";

export function DashboardAuditPage() {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";

  const [items, setItems] = useState<AuditEntry[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = (reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    const qs = reset || !cursor ? "" : `?cursor=${cursor}`;
    dashboardApi
      .get<{ items: AuditEntry[]; nextCursor: number | null }>(`/api/dashboard/audit${qs}`)
      .then((d) => {
        setItems((prev) => (reset ? d.items : [...prev, ...d.items]));
        setCursor(d.nextCursor);
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "سجلّ النشاط" : "Activity log"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "كل تغيير يحصل في الموقع يُسجَّل هنا."
              : "Every change in the site is recorded here."}
          </div>
        </div>
      </div>

      <Card tight>
        {loading ? (
          <div className="dashboard-loader" />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>{lang === "ar" ? "العملية" : "Action"}</th>
                  <th>{lang === "ar" ? "الكيان" : "Entity"}</th>
                  <th>{lang === "ar" ? "المعرّف" : "ID"}</th>
                  <th>{lang === "ar" ? "التاريخ" : "When"}</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className={ui.empty}>
                      {lang === "ar" ? "لا نشاط بعد" : "No activity yet"}
                    </td>
                  </tr>
                )}
                {items.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Badge tone={e.action.startsWith("dashboard") ? "brand" : "neutral"}>
                        {e.action}
                      </Badge>
                    </td>
                    <td>{e.entity}</td>
                    <td style={{ fontFamily: "var(--fz-font-mono)", fontSize: 12 }}>
                      {e.entityId ?? "—"}
                    </td>
                    <td style={{ color: "var(--fz-text-muted)" }}>
                      {new Date(e.createdAt).toLocaleString(lang === "ar" ? "ar-IQ" : "en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {cursor != null && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <Button variant="secondary" onClick={() => load(false)} loading={loadingMore}>
            {lang === "ar" ? "تحميل المزيد" : "Load more"}
          </Button>
        </div>
      )}
    </>
  );
}

export default DashboardAuditPage;
