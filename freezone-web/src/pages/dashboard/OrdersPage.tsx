/**
 * Orders list — server-driven against the frozen contract (a):
 * pagination + search/status/payment/date filters + column sorting + CSV
 * export (same filters) + filtered-set totals strip. Deep links seed the
 * search and status filters from `?search=` / `?status=`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Inbox } from "lucide-react";
import {
  ordersApi,
  saveBlobAsFile,
  type OrderListRow,
  type OrdersListQuery,
  type OrdersListResponse,
  type OrdersSort,
  type OrderStatus,
} from "@/lib/dashboard/api";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import { formatDateTime, formatInt, formatIQD } from "@/lib/dashboard/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Table,
  useToast,
  type TableSort,
} from "@/components/dashboard/ui";
import { ORDER_STATUSES, PAYMENT_METHODS, paymentKey, statusKey, STATUS_TONE } from "./orders/order-shared";
import s from "./Orders.module.css";

type Filters = {
  search: string;
  status: "" | OrderStatus;
  payment: string;
  from: string;
  to: string;
};

function isOrderStatus(v: string | null): v is OrderStatus {
  return v !== null && (ORDER_STATUSES as string[]).includes(v);
}

function toSortParam(sort: TableSort | null): OrdersSort {
  if (!sort) return "createdAt_desc";
  if (sort.key === "total") return sort.dir === "asc" ? "total_asc" : "total_desc";
  return sort.dir === "asc" ? "createdAt_asc" : "createdAt_desc";
}

export function DashboardOrdersPage() {
  const { lang, t, formatError } = useDashboardLocale();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // Seed filters from deep-link params (GlobalSearch / notifications bell).
  const [filters, setFilters] = useState<Filters>(() => ({
    search: searchParams.get("search") ?? "",
    status: isOrderStatus(searchParams.get("status")) ? (searchParams.get("status") as OrderStatus) : "",
    payment: searchParams.get("payment") ?? "",
    from: "",
    to: "",
  }));
  const [searchInput, setSearchInput] = useState(filters.search);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<TableSort | null>({ key: "createdAt", dir: "desc" });

  const [data, setData] = useState<OrdersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Debounce the search box into the applied filters (resets to page 1).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next === filters.search) return;
      setPage(1);
      setFilters((prev) => ({ ...prev, search: next }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, filters.search]);

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const listQuery = useMemo<OrdersListQuery>(
    () => ({
      page,
      pageSize,
      search: filters.search || undefined,
      status: filters.status || undefined,
      payment: filters.payment || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      sort: toSortParam(sort),
    }),
    [page, pageSize, filters, sort],
  );

  const requestSeq = useRef(0);
  useEffect(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    ordersApi
      .list(listQuery)
      .then((d) => {
        if (requestSeq.current !== seq) return;
        setData(d);
        setErr(null);
      })
      .catch((e: unknown) => {
        if (requestSeq.current !== seq) return;
        setErr(formatError(e));
      })
      .finally(() => {
        if (requestSeq.current === seq) setLoading(false);
      });
  }, [listQuery, formatError]);

  const onExport = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await ordersApi.exportCsv({
        search: filters.search || undefined,
        status: filters.status || undefined,
        payment: filters.payment || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      saveBlobAsFile(blob, filename);
      toast.success(t("orders.exportDone"));
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setExporting(false);
    }
  };

  const statusOptions = [
    { value: "", label: t("orders.allStatuses") },
    ...ORDER_STATUSES.map((st) => ({ value: st, label: t(statusKey(st)) })),
  ];

  const paymentOptions = [
    { value: "", label: t("orders.allPayments") },
    ...PAYMENT_METHODS.map((pm) => ({ value: pm, label: t(paymentKey(pm)!) })),
  ];

  const totals = data?.totals;

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{t("orders.title")}</h1>
          <div className="dashboard-page-subtitle">{t("orders.subtitle")}</div>
        </div>
        <Button variant="secondary" onClick={() => void onExport()} loading={exporting}>
          <Download size={15} aria-hidden /> {t("orders.exportCsv")}
        </Button>
      </div>

      <Card tight>
        <div className={s.filterBar}>
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("orders.searchPlaceholder")}
            aria-label={t("common.search")}
          />
          <Select
            value={filters.status}
            onChange={(e) => setFilter("status", (e.target as HTMLSelectElement).value as Filters["status"])}
            options={statusOptions}
            aria-label={t("orders.colStatus")}
          />
          <Select
            value={filters.payment}
            onChange={(e) => setFilter("payment", (e.target as HTMLSelectElement).value)}
            options={paymentOptions}
            aria-label={t("orders.colPayment")}
          />
        </div>

        <div className={s.dateRow}>
          <label className={s.dateField}>
            <span>{t("common.from")}</span>
            <input
              type="date"
              className={s.dateInput}
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => setFilter("from", e.target.value)}
            />
          </label>
          <label className={s.dateField}>
            <span>{t("common.to")}</span>
            <input
              type="date"
              className={s.dateInput}
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => setFilter("to", e.target.value)}
            />
          </label>
          {(filters.search || filters.status || filters.payment || filters.from || filters.to) && (
            <span className={s.dateActions}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchInput("");
                  setPage(1);
                  setFilters({ search: "", status: "", payment: "", from: "", to: "" });
                }}
              >
                {t("common.clear")}
              </Button>
            </span>
          )}
        </div>

        {totals && (
          <>
            <div className={s.totalsStrip} role="status">
              <div className={s.totalsCell}>
                <div className={s.totalsLabel}>{t("orders.totalsCount")}</div>
                <div className={s.totalsValue}>{formatInt(totals.count, lang)}</div>
              </div>
              <div className={s.totalsCell}>
                <div className={s.totalsLabel}>{t("orders.totalsRevenue")}</div>
                <div className={s.totalsValue}>{formatIQD(totals.revenue, lang)}</div>
              </div>
              <div className={s.totalsCell}>
                <div className={s.totalsLabel}>{t("orders.totalsAov")}</div>
                <div className={s.totalsValue}>{formatIQD(totals.aov, lang)}</div>
              </div>
              <div className={s.totalsCell}>
                <div className={s.totalsLabel}>{t("orders.totalsDiscount")}</div>
                <div className={s.totalsValue}>{formatIQD(totals.discount, lang)}</div>
              </div>
              <div className={s.totalsCell}>
                <div className={s.totalsLabel}>{t("orders.totalsShipping")}</div>
                <div className={s.totalsValue}>{formatIQD(totals.shipping, lang)}</div>
              </div>
            </div>
            <div className={s.totalsHint}>{t("orders.totalsHint")}</div>
          </>
        )}

        {loading && !data ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div className={s.errorBox} role="alert">
            {err}
          </div>
        ) : (
          <Table<OrderListRow>
            rowKey={(o) => o.id}
            rows={data?.items ?? []}
            sort={sort}
            onSortChange={(next) => {
              setPage(1);
              setSort(next);
            }}
            empty={
              <EmptyState
                icon={<Inbox size={26} />}
                title={t("orders.empty")}
                description={t("orders.emptyHint")}
              />
            }
            pagination={{
              page,
              pageSize,
              total: data?.total ?? 0,
              onPageChange: setPage,
              onPageSizeChange: (next) => {
                setPage(1);
                setPageSize(next);
              },
            }}
            columns={[
              {
                header: t("orders.colOrder"),
                mono: true,
                cell: (o) => (
                  <Link to={`/admin/orders/${o.id}`} className={s.orderNumber}>
                    {o.orderNumber}
                  </Link>
                ),
              },
              {
                header: t("orders.colDate"),
                sortKey: "createdAt",
                cell: (o) => <span className={s.cellSub}>{formatDateTime(o.createdAt, lang)}</span>,
              },
              {
                header: t("orders.colCustomer"),
                cell: (o) => (
                  <div>
                    <div>{o.customerName}</div>
                    <div className={s.cellSub} dir="ltr">
                      {o.customerPhone}
                    </div>
                  </div>
                ),
              },
              {
                header: t("orders.colCity"),
                cell: (o) => o.city || t("common.none"),
              },
              {
                header: t("orders.colPayment"),
                cell: (o) => {
                  const key = paymentKey(o.paymentMethod);
                  return <span className={s.cellSub}>{key ? t(key) : o.paymentMethod}</span>;
                },
              },
              {
                header: t("orders.colItems"),
                align: "end",
                mono: true,
                width: "70px",
                cell: (o) => formatInt(o.itemCount, lang),
              },
              {
                header: t("orders.colTotal"),
                sortKey: "total",
                align: "end",
                mono: true,
                cell: (o) => formatIQD(o.total, lang),
              },
              {
                header: t("orders.colStatus"),
                width: "120px",
                cell: (o) => <Badge tone={STATUS_TONE[o.status]}>{t(statusKey(o.status))}</Badge>,
              },
              {
                header: "",
                align: "end",
                cell: (o) => (
                  <Link to={`/admin/orders/${o.id}`}>
                    <Button size="sm" variant="secondary" tabIndex={-1}>
                      {t("common.view")}
                    </Button>
                  </Link>
                ),
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}

export default DashboardOrdersPage;
