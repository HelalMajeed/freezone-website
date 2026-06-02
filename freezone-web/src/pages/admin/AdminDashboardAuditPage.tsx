import { useEffect, useState } from "react";
import { freezoneApiUrl } from "@/lib/api-internal";
import type { AuditEntry } from "@/lib/dashboard/api";
import { Badge, Button, Card } from "@/components/dashboard/ui";
import ui from "@/components/dashboard/ui/ui.module.css";

type AuditPage = { items: AuditEntry[]; nextCursor: number | null };

async function fetchAuditPage(cursor?: number | null): Promise<AuditPage> {
  const qs = new URLSearchParams({ limit: "150" });
  if (cursor) qs.set("cursor", String(cursor));
  const res = await fetch(freezoneApiUrl(`/api/dashboard/audit?${qs}`), {
    credentials: "include",
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: AuditPage;
    items?: AuditEntry[];
    rows?: AuditEntry[];
    nextCursor?: number | null;
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    const msg =
      json.error ??
      (json.code === "UNAUTHENTICATED" ? "يجب تسجيل الدخول أولاً" : json.code ?? "تعذّر تحميل السجل");
    throw new Error(msg);
  }
  const data = (json.data ?? json) as AuditPage & { rows?: AuditEntry[] };
  const items = data.items ?? data.rows ?? [];
  return { items, nextCursor: data.nextCursor ?? null };
}

export function DashboardAuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = (reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    fetchAuditPage(reset ? null : cursor)
      .then((d) => {
        setItems((prev) => (reset ? d.items : [...prev, ...d.items]));
        setCursor(d.nextCursor);
        setErr(null);
      })
      .catch((e: Error) => {
        if (reset) setItems([]);
        setErr(e.message);
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
          <h1 className="dashboard-page-title">سجلّ النشاط</h1>
          <div className="dashboard-page-subtitle">كل تغيير على المنتجات والأقسام والعلامات يُسجَّل هنا.</div>
        </div>
      </div>

      {err ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: "var(--fz-radius)",
            background: "var(--fz-danger-bg)",
            color: "var(--fz-danger)",
            fontSize: 14,
          }}
        >
          {err}
        </div>
      ) : null}

      <Card tight>
        {loading ? (
          <div className="dashboard-loader" />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>العملية</th>
                  <th>الكيان</th>
                  <th>المعرّف</th>
                  <th>المستخدم</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !err && (
                  <tr>
                    <td colSpan={5} className={ui.empty}>
                      لا نشاط بعد — عدّل منتجاً أو قسماً ثم حدّث الصفحة.
                    </td>
                  </tr>
                )}
                {items.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Badge tone={e.action.startsWith("dashboard") ? "brand" : "neutral"}>{e.action}</Badge>
                    </td>
                    <td>{e.entity}</td>
                    <td style={{ fontFamily: "var(--fz-font-mono)", fontSize: 12 }}>{e.entityId ?? "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>{e.userEmail ?? "—"}</td>
                    <td style={{ color: "var(--fz-text-muted)" }}>
                      {new Date(e.createdAt).toLocaleString("ar-IQ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {cursor != null && !err && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <Button variant="secondary" onClick={() => load(false)} loading={loadingMore}>
            تحميل المزيد
          </Button>
        </div>
      )}
    </>
  );
}

export default DashboardAuditPage;
