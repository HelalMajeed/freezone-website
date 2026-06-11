/**
 * Overview — dashboard home per the design-system pattern (§4.3):
 * date-range presets + period-over-period comparison from
 * GET /api/admin/dashboard/analytics (frozen contract f), KPI cards with delta
 * badges, lightweight inline-SVG revenue area chart, category/brand share
 * bars, sales-by-city + coupon performance, quick actions, and the
 * threshold-aware low-stock list from /api/dashboard/overview.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Image,
  LayoutTemplate,
  Package,
  PackageX,
  Percent,
  Settings,
  Star,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";
import {
  analyticsApi,
  dashboardApi,
  type AnalyticsResponse,
  type OrderStatus,
  type OverviewResponse,
} from "@/lib/dashboard/api";
import { useDashboardLocale, type DashboardMessageKey } from "@/lib/dashboard/i18n";
import {
  daysAgoInputValue,
  formatDate,
  formatDateTime,
  formatDeltaPct,
  formatInt,
  formatIQD,
  toDateInputValue,
} from "@/lib/dashboard/format";
import { Badge, Button, Card, ui } from "@/components/dashboard/ui";
import { ORDER_STATUSES, statusKey, STATUS_TONE } from "./orders/order-shared";
import s from "./Overview.module.css";

type Preset = "today" | "7d" | "30d" | "custom";

type LowStockRow = OverviewResponse["lowStock"][number] & { lowStockThreshold?: number };

/** Additive overview fields (latest orders count bump + pending reviews). */
type OverviewData = OverviewResponse & { pendingReviews?: number };

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}

const PRESET_KEYS: Array<{ value: Preset; key: DashboardMessageKey }> = [
  { value: "today", key: "overview.rangeToday" },
  { value: "7d", key: "overview.range7d" },
  { value: "30d", key: "overview.range30d" },
  { value: "custom", key: "overview.rangeCustom" },
];

function presetRange(preset: Exclude<Preset, "custom">): { from: string; to: string } {
  const today = toDateInputValue(new Date());
  if (preset === "today") return { from: today, to: today };
  if (preset === "7d") return { from: daysAgoInputValue(6), to: today };
  return { from: daysAgoInputValue(29), to: today };
}

/** Tiny inline SVG area chart — no chart library (per WS3-B constraints). */
function RevenueAreaChart({
  points,
  label,
}: {
  points: AnalyticsResponse["revenueByDay"];
  label: (p: AnalyticsResponse["revenueByDay"][number]) => string;
}) {
  const W = 600;
  const H = 180;
  const PAD = 6;
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? PAD + i * stepX : W / 2;
    const y = H - PAD - (p.revenue / max) * (H - PAD * 2);
    return [x, y] as const;
  });
  const line = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area =
    coords.length > 0
      ? `${line} L${coords[coords.length - 1][0].toFixed(1)},${H - PAD} L${coords[0][0].toFixed(1)},${H - PAD} Z`
      : "";

  return (
    <svg
      className={s.chartSvg}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-hidden={points.length === 0}
    >
      {/* horizontal grid lines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={PAD}
          x2={W - PAD}
          y1={PAD + f * (H - PAD * 2)}
          y2={PAD + f * (H - PAD * 2)}
          stroke="var(--fz-chart-grid)"
          strokeWidth={1}
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {area && <path d={area} fill="var(--fz-chart-area-fill)" stroke="none" />}
      {line && (
        <path
          d={line}
          fill="none"
          stroke="var(--fz-chart-1)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      )}
      {/* invisible hover bands with native tooltips */}
      {points.map((p, i) => {
        const bandW = points.length > 1 ? stepX : W;
        const x = points.length > 1 ? PAD + i * stepX - bandW / 2 : 0;
        return (
          <rect key={p.date} x={x} y={0} width={bandW} height={H} fill="transparent">
            <title>{label(p)}</title>
          </rect>
        );
      })}
    </svg>
  );
}

function DeltaBadge({ pct, invert }: { pct: number | null; invert?: boolean }) {
  const { lang } = useDashboardLocale();
  if (pct === null) return null;
  const up = pct > 0;
  const flat = pct === 0;
  const good = flat ? null : invert ? !up : up;
  const cls = [
    s.deltaBadge,
    flat ? s.deltaFlat : good ? s.deltaUp : s.deltaDown,
  ].join(" ");
  return (
    <span className={cls}>
      {!flat && (up ? <TrendingUp size={11} aria-hidden /> : <TrendingDown size={11} aria-hidden />)}
      {formatDeltaPct(pct, lang)}
    </span>
  );
}

export function DashboardOverviewPage() {
  const { lang, t, formatError } = useDashboardLocale();

  const [preset, setPreset] = useState<Preset>("30d");
  const [range, setRange] = useState(() => presetRange("30d"));
  const [draftFrom, setDraftFrom] = useState(range.from);
  const [draftTo, setDraftTo] = useState(range.to);

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    analyticsApi
      .range({ from: range.from, to: range.to, compare: true })
      .then((d) => {
        if (!alive) return;
        setAnalytics(d);
        setErr(null);
      })
      .catch((e: unknown) => {
        if (alive) setErr(formatError(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [range, formatError]);

  useEffect(() => {
    let alive = true;
    dashboardApi
      .get<OverviewData>("/api/dashboard/overview")
      .then((d) => {
        if (alive) setOverview(d);
      })
      .catch(() => {
        /* low-stock rail is best-effort */
      });
    return () => {
      alive = false;
    };
  }, []);

  const onPreset = (next: Preset) => {
    setPreset(next);
    if (next !== "custom") {
      const r = presetRange(next);
      setRange(r);
      setDraftFrom(r.from);
      setDraftTo(r.to);
    }
  };

  const applyCustom = () => {
    if (!draftFrom || !draftTo) return;
    setRange({ from: draftFrom, to: draftTo });
  };

  const totals = analytics?.totals;
  const previous = analytics?.previous ?? null;
  const delta = analytics?.delta ?? null;

  const cancelRate = useMemo(() => {
    if (!totals) return null;
    const all = totals.orders + totals.cancelledOrders;
    return all > 0 ? (totals.cancelledOrders / all) * 100 : 0;
  }, [totals]);

  const prevCancelRate = useMemo(() => {
    if (!previous) return null;
    const all = previous.orders + previous.cancelledOrders;
    return all > 0 ? (previous.cancelledOrders / all) * 100 : 0;
  }, [previous]);

  const cancelDelta =
    cancelRate !== null && prevCancelRate !== null ? cancelRate - prevCancelRate : null;

  const pickName = (row: { nameEn: string; nameAr: string }) =>
    lang === "ar" ? row.nameAr || row.nameEn : row.nameEn || row.nameAr;

  const lowStock: LowStockRow[] = (overview?.lowStock ?? []) as LowStockRow[];

  const quickActions: Array<{ to: string; key: DashboardMessageKey; icon: ReactNode }> = [
    { to: "/admin/products", key: "overview.qaProducts", icon: <Package size={16} aria-hidden /> },
    { to: "/admin/orders", key: "overview.qaOrders", icon: <Truck size={16} aria-hidden /> },
    { to: "/admin/coupons", key: "overview.qaCoupons", icon: <Percent size={16} aria-hidden /> },
    { to: "/admin/media", key: "overview.qaMedia", icon: <Image size={16} aria-hidden /> },
    { to: "/admin/cms", key: "overview.qaCms", icon: <LayoutTemplate size={16} aria-hidden /> },
    { to: "/admin/settings", key: "overview.qaSettings", icon: <Settings size={16} aria-hidden /> },
  ];

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{t("overview.title")}</h1>
          <div className="dashboard-page-subtitle">{t("overview.subtitle")}</div>
        </div>
        <div className={s.rangeBar}>
          <div className={s.presets} role="group" aria-label={t("overview.rangeCustom")}>
            {PRESET_KEYS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={[s.presetBtn, preset === p.value && s.presetActive]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={preset === p.value}
                onClick={() => onPreset(p.value)}
              >
                {t(p.key)}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <span className={s.customRange}>
              <input
                type="date"
                className={s.dateInput}
                value={draftFrom}
                max={draftTo || undefined}
                onChange={(e) => setDraftFrom(e.target.value)}
                aria-label={t("common.from")}
              />
              <input
                type="date"
                className={s.dateInput}
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(e) => setDraftTo(e.target.value)}
                aria-label={t("common.to")}
              />
              <Button size="sm" variant="secondary" onClick={applyCustom} disabled={!draftFrom || !draftTo}>
                {t("common.apply")}
              </Button>
            </span>
          )}
        </div>
      </div>

      {loading && !analytics ? (
        <div className="dashboard-loader" />
      ) : err && !analytics ? (
        <Card>
          <div className={s.errorBox} role="alert">
            {err}
          </div>
        </Card>
      ) : analytics && totals ? (
        <>
          {/* ── KPI row ── */}
          <div className={ui.kpiGrid}>
            <div className={ui.kpi}>
              <div className={ui.kpiLabel}>{t("overview.kpiRevenue")}</div>
              <div className={ui.kpiValue}>{formatIQD(totals.revenue, lang)}</div>
              <div className={s.kpiDeltaRow}>
                <DeltaBadge pct={delta?.revenuePct ?? null} />
                {analytics.previousRange && <span>{t("overview.vsPrevious")}</span>}
              </div>
            </div>
            <div className={ui.kpi}>
              <div className={ui.kpiLabel}>{t("overview.kpiOrders")}</div>
              <div className={ui.kpiValue}>{formatInt(totals.orders, lang)}</div>
              <div className={s.kpiDeltaRow}>
                <DeltaBadge pct={delta?.ordersPct ?? null} />
                {analytics.previousRange && <span>{t("overview.vsPrevious")}</span>}
              </div>
            </div>
            <div className={ui.kpi}>
              <div className={ui.kpiLabel}>{t("overview.kpiAov")}</div>
              <div className={ui.kpiValue}>{formatIQD(totals.aov, lang)}</div>
              <div className={s.kpiDeltaRow}>
                <DeltaBadge pct={delta?.aovPct ?? null} />
                {analytics.previousRange && <span>{t("overview.vsPrevious")}</span>}
              </div>
            </div>
            <div className={ui.kpi}>
              <div className={ui.kpiLabel}>{t("overview.kpiUnits")}</div>
              <div className={ui.kpiValue}>{formatInt(totals.units, lang)}</div>
              <div className={s.kpiDeltaRow}>
                <DeltaBadge pct={delta?.unitsPct ?? null} />
                {analytics.previousRange && <span>{t("overview.vsPrevious")}</span>}
              </div>
            </div>
            <div className={ui.kpi}>
              <div className={ui.kpiLabel}>{t("overview.kpiCancelRate")}</div>
              <div className={ui.kpiValue}>
                {cancelRate !== null
                  ? `${new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-GB", {
                      maximumFractionDigits: 1,
                    }).format(cancelRate)}%`
                  : "—"}
              </div>
              <div className={s.kpiDeltaRow}>
                <DeltaBadge pct={cancelDelta} invert />
                {analytics.previousRange && <span>{t("overview.vsPrevious")}</span>}
              </div>
            </div>
          </div>

          <div className={ui.twoCol}>
            {/* ── Main column ── */}
            <div className={s.mainCol}>
              <Card title={t("overview.revenueByDay")}>
                {analytics.revenueByDay.length === 0 ? (
                  <div className={s.emptyNote}>{t("overview.noData")}</div>
                ) : (
                  <div className={s.chartWrap}>
                    <RevenueAreaChart
                      points={analytics.revenueByDay}
                      label={(p) =>
                        `${formatDate(p.date, lang)} — ${formatIQD(p.revenue, lang)} (${formatInt(
                          p.orders,
                          lang,
                        )} ${t("overview.ordersSuffix")})`
                      }
                    />
                    <div className={s.chartAxis}>
                      <span>{formatDate(analytics.range.from, lang)}</span>
                      <span>{formatDate(analytics.range.to, lang)}</span>
                    </div>
                  </div>
                )}
              </Card>

              <div className={s.splitCards}>
                <Card title={t("overview.revenueByCategory")}>
                  {analytics.revenueByCategory.length === 0 ? (
                    <div className={s.emptyNote}>{t("overview.noData")}</div>
                  ) : (
                    <div className={s.barList}>
                      {analytics.revenueByCategory.slice(0, 8).map((row) => (
                        <div key={`${row.categoryId}-${row.slug}`} className={s.barRow}>
                          <div className={s.barHead}>
                            <span className={s.barName}>{pickName(row)}</span>
                            <span className={s.barValue}>{formatIQD(row.revenue, lang)}</span>
                          </div>
                          <div className={s.barTrack}>
                            <div
                              className={s.barFill}
                              style={{ width: `${Math.max(1, Math.min(100, row.sharePct))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title={t("overview.revenueByBrand")}>
                  {analytics.revenueByBrand.length === 0 ? (
                    <div className={s.emptyNote}>{t("overview.noData")}</div>
                  ) : (
                    <div className={s.barList}>
                      {analytics.revenueByBrand.slice(0, 8).map((row) => (
                        <div key={`${row.brandId}-${row.slug}`} className={s.barRow}>
                          <div className={s.barHead}>
                            <span className={s.barName}>{pickName(row)}</span>
                            <span className={s.barValue}>{formatIQD(row.revenue, lang)}</span>
                          </div>
                          <div className={s.barTrack}>
                            <div
                              className={`${s.barFill} ${s.barFillAlt}`}
                              style={{ width: `${Math.max(1, Math.min(100, row.sharePct))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              <Card title={t("overview.couponPerformance")} tight>
                {analytics.couponPerformance.length === 0 ? (
                  <div className={s.emptyNote}>{t("overview.noData")}</div>
                ) : (
                  <table className={s.couponTable}>
                    <thead>
                      <tr>
                        <th>{t("overview.colCoupon")}</th>
                        <th className={s.numCell}>{t("overview.colUses")}</th>
                        <th className={s.numCell}>{t("overview.colDiscount")}</th>
                        <th className={s.numCell}>{t("overview.colRevenue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.couponPerformance.map((c) => (
                        <tr key={c.code}>
                          <td>
                            <div className={s.couponCode} dir="ltr">
                              {c.code}
                            </div>
                            <div className={s.listMeta}>
                              {lang === "ar" ? c.labelAr || c.labelEn : c.labelEn || c.labelAr}
                            </div>
                          </td>
                          <td className={s.numCell}>{formatInt(c.uses, lang)}</td>
                          <td className={s.numCell}>{formatIQD(c.discountTotal, lang)}</td>
                          <td className={s.numCell}>{formatIQD(c.revenue, lang)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              <Card
                title={
                  <span className={s.cardTitleRow}>
                    {t("overview.latestOrders")}{" "}
                    <Link to="/admin/orders" className={s.cardTitleLink}>
                      {t("overview.viewAllOrders")}
                    </Link>
                  </span>
                }
              >
                {!overview || overview.recentOrders.length === 0 ? (
                  <div className={s.emptyNote}>{t("overview.latestOrdersEmpty")}</div>
                ) : (
                  overview.recentOrders.map((o) => (
                    <div key={o.id} className={s.listRow}>
                      <div className={s.listMain}>
                        <div className={s.listName}>
                          <Link to={`/admin/orders/${o.id}`}>{o.orderNumber}</Link>
                        </div>
                        <div className={s.listMeta}>
                          {o.customerName} · {formatDateTime(o.createdAt, lang)}
                        </div>
                      </div>
                      <div className={s.listEnd}>
                        <span>{formatIQD(o.total, lang)}</span>
                        <div>
                          {isOrderStatus(o.status) ? (
                            <Badge tone={STATUS_TONE[o.status]}>{t(statusKey(o.status))}</Badge>
                          ) : (
                            <Badge tone="neutral">{o.status}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>

            {/* ── End rail ── */}
            <div className={s.railCol}>
              <Card title={t("overview.quickActions")}>
                <div className={s.quickActions}>
                  {quickActions.map((qa) => (
                    <Link key={qa.to} to={qa.to} className={s.quickAction}>
                      <span className={s.quickActionIcon}>{qa.icon}</span>
                      <span>{t(qa.key)}</span>
                    </Link>
                  ))}
                </div>
              </Card>

              <Card title={t("overview.pendingReviews")}>
                <div className={s.sectionHint}>{t("overview.pendingReviewsHint")}</div>
                <div className={s.listRow}>
                  <div className={s.listMain}>
                    <div className={s.listName}>
                      <Star size={15} aria-hidden style={{ verticalAlign: "-2px" }} />{" "}
                      {(overview?.pendingReviews ?? 0) > 0 ? (
                        <Badge tone="warning">{formatInt(overview?.pendingReviews ?? 0, lang)}</Badge>
                      ) : (
                        <span className={s.listMeta}>{t("overview.pendingReviewsEmpty")}</span>
                      )}
                    </div>
                  </div>
                  <div className={s.listEnd}>
                    <Link to="/admin/reviews">
                      <Button size="sm" variant="secondary">
                        {t("overview.moderateReviews")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>

              <Card title={t("overview.statusBreakdown")}>
                {ORDER_STATUSES.map((st) => (
                  <div key={st} className={s.listRow}>
                    <div className={s.listMain}>
                      <Badge tone={STATUS_TONE[st]}>{t(statusKey(st))}</Badge>
                    </div>
                    <div className={s.listEnd}>
                      <Link to={`/admin/orders?status=${st}`}>
                        {formatInt(overview?.statusCounts?.[st] ?? 0, lang)}
                      </Link>
                    </div>
                  </div>
                ))}
              </Card>

              <Card title={t("overview.salesByCity")}>
                {analytics.salesByCity.length === 0 ? (
                  <div className={s.emptyNote}>{t("overview.noData")}</div>
                ) : (
                  analytics.salesByCity.slice(0, 10).map((c) => (
                    <div key={c.city} className={s.listRow}>
                      <div className={s.listMain}>
                        <div className={s.listName}>{c.city || t("common.none")}</div>
                        <div className={s.listMeta}>
                          {formatInt(c.orders, lang)} {t("overview.ordersSuffix")}
                        </div>
                      </div>
                      <div className={s.listEnd}>{formatIQD(c.revenue, lang)}</div>
                    </div>
                  ))
                )}
              </Card>

              <Card title={t("overview.topProducts")}>
                {analytics.topProducts.length === 0 ? (
                  <div className={s.emptyNote}>{t("overview.noData")}</div>
                ) : (
                  analytics.topProducts.map((p) => (
                    <div key={p.productId} className={s.listRow}>
                      <div className={s.listMain}>
                        <div className={s.listName}>{pickName(p)}</div>
                        <div className={s.listMeta}>
                          {formatInt(p.units, lang)} {t("overview.unitsSuffix")}
                        </div>
                      </div>
                      <div className={s.listEnd}>{formatIQD(p.revenue, lang)}</div>
                    </div>
                  ))
                )}
              </Card>

              <Card
                title={
                  <span>
                    {t("overview.lowStock")}{" "}
                    {lowStock.length > 0 && <Badge tone="warning">{lowStock.length}</Badge>}
                  </span>
                }
              >
                <div className={s.sectionHint}>{t("overview.lowStockHint")}</div>
                {lowStock.length === 0 ? (
                  <div className={s.emptyNote}>{t("overview.lowStockEmpty")}</div>
                ) : (
                  lowStock.map((p) => (
                    <div key={p.id} className={s.listRow}>
                      <span className={s.thumb}>
                        {p.images[0]?.url ? (
                          <img src={p.images[0].url} alt="" />
                        ) : (
                          <PackageX size={16} aria-hidden />
                        )}
                      </span>
                      <div className={s.listMain}>
                        <div className={s.listName}>
                          {lang === "ar" ? p.nameAr || p.nameEn : p.nameEn || p.nameAr}
                        </div>
                        <div className={s.listMeta}>
                          {[p.brand, p.sku].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <div className={s.listEnd}>
                        <span className={s.lowQty}>{formatInt(p.quantity, lang)}</span>
                        {typeof p.lowStockThreshold === "number" && (
                          <div className={s.listMeta}>
                            {t("overview.thresholdShort", { n: p.lowStockThreshold })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

export default DashboardOverviewPage;
