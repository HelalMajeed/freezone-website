import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { dashboardApi, type OverviewResponse } from "@/lib/dashboard/api";
import { Badge, Card } from "@/components/dashboard/ui";
import ui from "@/components/dashboard/ui/ui.module.css";
import s from "./Overview.module.css";

function formatIQD(n: number, lang: "ar" | "en"): string {
  // Iraqi Dinar — no decimals, thousands separator
  const formatted = new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-IQ", {
    maximumFractionDigits: 0,
  }).format(n);
  return lang === "ar" ? `${formatted} د.ع` : `${formatted} IQD`;
}

function formatDate(iso: string, lang: "ar" | "en"): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-IQ" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function statusTone(status: string): "success" | "info" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "delivered":
      return "success";
    case "shipped":
    case "processing":
      return "info";
    case "confirmed":
    case "pending":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export function DashboardOverviewPage() {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";

  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .get<OverviewResponse>("/api/dashboard/overview")
      .then((d) => {
        setData(d);
        setErr(null);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-loader" />;
  if (err) return <Card title={lang === "ar" ? "خطأ" : "Error"}>{err}</Card>;
  if (!data) return null;

  const maxRev = Math.max(1, ...data.sparkline.map((p) => p.revenue));

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{lang === "ar" ? "لوحة التحكم" : "Dashboard"}</h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "نظرة سريعة على متجرك الآن"
              : "A live snapshot of your store right now"}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className={ui.kpiGrid}>
        <Kpi label={lang === "ar" ? "طلبات اليوم" : "Orders today"} value={data.kpis.ordersToday.toString()} />
        <Kpi
          label={lang === "ar" ? "إيراد اليوم" : "Revenue today"}
          value={formatIQD(data.kpis.revenueToday, lang)}
        />
        <Kpi label={lang === "ar" ? "طلبات الأسبوع" : "Orders 7d"} value={data.kpis.ordersWeek.toString()} />
        <Kpi
          label={lang === "ar" ? "إيراد الأسبوع" : "Revenue 7d"}
          value={formatIQD(data.kpis.revenueWeek, lang)}
        />
        <Kpi label={lang === "ar" ? "المنتجات" : "Products"} value={data.kpis.products.toString()} />
        <Kpi label={lang === "ar" ? "الأقسام" : "Categories"} value={data.kpis.categories.toString()} />
        <Kpi label={lang === "ar" ? "العلامات" : "Brands"} value={data.kpis.brands.toString()} />
        <Kpi
          label={lang === "ar" ? "كوبونات فعّالة" : "Active coupons"}
          value={data.kpis.activeCoupons.toString()}
        />
      </div>

      <div className={ui.twoCol}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card title={lang === "ar" ? "آخر ١٤ يوم — الإيراد" : "Last 14 days — revenue"}>
            <div className={s.sparkRow}>
              {data.sparkline.map((p, i) => {
                const h = Math.max(2, (p.revenue / maxRev) * 100);
                return (
                  <div
                    key={i}
                    className={s.sparkBar}
                    style={{ height: `${h}%` }}
                    data-tip={`${p.date}: ${formatIQD(p.revenue, lang)} (${p.orders})`}
                  />
                );
              })}
            </div>
            <div className={s.sparkAxis}>
              <span>{data.sparkline[0]?.date}</span>
              <span>{data.sparkline[data.sparkline.length - 1]?.date}</span>
            </div>
          </Card>

          <Card title={lang === "ar" ? "آخر الطلبات" : "Recent orders"}>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>{lang === "ar" ? "الرقم" : "Order"}</th>
                    <th>{lang === "ar" ? "الزبون" : "Customer"}</th>
                    <th>{lang === "ar" ? "الحالة" : "Status"}</th>
                    <th>{lang === "ar" ? "الإجمالي" : "Total"}</th>
                    <th>{lang === "ar" ? "التاريخ" : "Date"}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: "var(--fz-font-mono)", fontSize: 12 }}>{o.orderNumber}</td>
                      <td>{o.customerName}</td>
                      <td>
                        <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatIQD(o.total, lang)}</td>
                      <td style={{ color: "var(--fz-text-muted)" }}>{formatDate(o.createdAt, lang)}</td>
                    </tr>
                  ))}
                  {data.recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className={ui.empty}>
                        {lang === "ar" ? "لا توجد طلبات بعد" : "No orders yet"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card title={lang === "ar" ? "حالات الطلبات" : "Order status"}>
            <div className={s.statusGrid}>
              {Object.entries(data.statusCounts).map(([status, n]) => (
                <div key={status} className={s.statusItem}>
                  <div className={s.statusLabel}>{status}</div>
                  <div className={s.statusValue}>{n}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title={lang === "ar" ? "الأكثر مبيعاً" : "Top sellers"}>
            {data.topProducts.length === 0 ? (
              <div className={ui.empty}>{lang === "ar" ? "لا بيانات" : "No data"}</div>
            ) : (
              data.topProducts.map((p) => (
                <div className={s.productRow} key={p.id}>
                  <div className={s.productThumb}>
                    {p.images[0]?.url ? <img src={p.images[0].url} alt="" /> : "▢"}
                  </div>
                  <div className={s.productInfo}>
                    <div className={s.productName}>{lang === "ar" ? p.nameAr || p.nameEn : p.nameEn}</div>
                    <div className={s.productMeta}>
                      ★ {p.rating.toFixed(1)} · {p.sales} {lang === "ar" ? "مباع" : "sold"}
                    </div>
                  </div>
                  <div className={s.productRight}>{formatIQD(p.price, lang)}</div>
                </div>
              ))
            )}
          </Card>

          <Card
            title={
              <span>
                {lang === "ar" ? "مخزون منخفض" : "Low stock"}{" "}
                <Badge tone="warning">{data.lowStock.length}</Badge>
              </span>
            }
          >
            {data.lowStock.length === 0 ? (
              <div className={ui.empty}>{lang === "ar" ? "كل شيء بخير" : "All good"}</div>
            ) : (
              data.lowStock.map((p) => (
                <div className={s.productRow} key={p.id}>
                  <div className={s.productThumb}>
                    {p.images[0]?.url ? <img src={p.images[0].url} alt="" /> : "▢"}
                  </div>
                  <div className={s.productInfo}>
                    <div className={s.productName}>{lang === "ar" ? p.nameAr || p.nameEn : p.nameEn}</div>
                    <div className={s.productMeta}>
                      {p.brand} · {p.sku || "—"}
                    </div>
                  </div>
                  <div className={s.productRight} style={{ color: "var(--fz-danger)" }}>
                    {p.quantity}
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className={ui.kpi}>
      <div className={ui.kpiLabel}>{label}</div>
      <div className={ui.kpiValue}>{value}</div>
    </div>
  );
}

export default DashboardOverviewPage;
