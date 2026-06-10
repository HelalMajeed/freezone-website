/**
 * Customers admin (API_CONTRACT §5) — storefront accounts with order stats:
 * search, blocked filter, pagination, a detail drawer with the customer's
 * order history, and SUPER_ADMIN-only block/unblock (confirmed; blocking
 * revokes every customer session server-side).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import {
  customersAdminApi,
  type CustomerDetail,
  type CustomerListRow,
  type CustomerOrderRow,
} from "@/lib/dashboard/api-extra";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import { formatDateTime, formatInt, formatIQD } from "@/lib/dashboard/format";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Input,
  Select,
  Table,
  useConfirm,
  useToast,
} from "@/components/dashboard/ui";
import { statusKey, STATUS_TONE } from "./orders/order-shared";

type BlockedFilter = "" | "true" | "false";

const PAGE_SIZE_DEFAULT = 25;

export function DashboardCustomersPage() {
  const { lang, t, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const isSuperAdmin = useDashboardAuth((s) => s.hasRole("superadmin"));

  const [rows, setRows] = useState<CustomerListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [blocked, setBlocked] = useState<BlockedFilter>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  // Detail drawer
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ customer: CustomerDetail; orders: CustomerOrderRow[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  // Debounced search → resets to page 1.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    customersAdminApi
      .list({
        search: search || undefined,
        blocked: blocked || undefined,
        page,
        pageSize,
      })
      .then((res) => {
        if (!alive) return;
        setRows(res.customers);
        setTotal(res.total);
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
  }, [search, blocked, page, pageSize, reloadKey, formatError]);

  // Detail drawer fetch.
  useEffect(() => {
    if (detailId === null) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    customersAdminApi
      .detail(detailId)
      .then((res) => {
        if (alive) setDetail(res);
      })
      .catch((e: unknown) => {
        if (alive) {
          toast.error(formatError(e));
          setDetailId(null);
        }
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on id / reload change
  }, [detailId, reloadKey]);

  const onToggleBlocked = async (customer: { id: number; name: string; isBlocked: boolean }) => {
    if (!isSuperAdmin) {
      toast.error(t("customers.superAdminOnly"));
      return;
    }
    const next = !customer.isBlocked;
    const sure = await confirm({
      title: next ? t("customers.blockTitle") : t("customers.unblockTitle"),
      message: next
        ? t("customers.blockMessage", { name: customer.name })
        : t("customers.unblockMessage", { name: customer.name }),
      confirmLabel: next ? t("customers.block") : t("customers.unblock"),
      tone: next ? "danger" : "default",
    });
    if (!sure) return;
    try {
      await customersAdminApi.setBlocked(customer.id, next);
      toast.success(next ? t("customers.blockedToast") : t("customers.unblockedToast"));
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const statusBadge = (isBlocked: boolean) =>
    isBlocked ? (
      <Badge tone="danger">{t("customers.statusBlocked")}</Badge>
    ) : (
      <Badge tone="success">{t("customers.statusActive")}</Badge>
    );

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{t("customers.title")}</h1>
          <div className="dashboard-page-subtitle">{t("customers.subtitle")}</div>
        </div>
      </div>

      <Card tight>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "12px 14px" }}>
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("customers.searchPlaceholder")}
            aria-label={t("common.search")}
            style={{ flex: "1 1 240px" }}
          />
          <Select
            value={blocked}
            onChange={(e) => {
              setBlocked((e.target as HTMLSelectElement).value as BlockedFilter);
              setPage(1);
            }}
            aria-label={t("customers.colStatus")}
            options={[
              { value: "", label: t("customers.filterAll") },
              { value: "false", label: t("customers.filterActive") },
              { value: "true", label: t("customers.filterBlocked") },
            ]}
          />
        </div>

        {loading ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div style={{ padding: 20, color: "var(--fz-danger)" }} role="alert">
            {err}
          </div>
        ) : (
          <Table
            rowKey={(c) => c.id}
            rows={rows}
            empty={
              <EmptyState
                icon={<Users size={26} />}
                title={t("customers.empty")}
                description={t("customers.emptyHint")}
              />
            }
            pagination={{
              page,
              pageSize,
              total,
              onPageChange: setPage,
              onPageSizeChange: (n) => {
                setPageSize(n);
                setPage(1);
              },
            }}
            columns={[
              {
                header: t("customers.colCustomer"),
                cell: (c) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }} dir="ltr">
                      {c.phone}
                      {c.email ? ` · ${c.email}` : ""}
                    </div>
                  </div>
                ),
              },
              {
                header: t("customers.colOrders"),
                align: "end",
                cell: (c) => formatInt(c.orderCount, lang),
              },
              {
                header: t("customers.colSpent"),
                align: "end",
                cell: (c) => formatIQD(c.totalSpent, lang),
              },
              {
                header: t("customers.colStatus"),
                cell: (c) => statusBadge(c.isBlocked),
              },
              {
                header: t("customers.colJoined"),
                cell: (c) => formatDateTime(c.createdAt, lang),
              },
              {
                header: "",
                cell: (c) => (
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <Button size="sm" variant="secondary" onClick={() => setDetailId(c.id)}>
                      {t("customers.details")}
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        size="sm"
                        variant={c.isBlocked ? "secondary" : "ghost"}
                        onClick={() => void onToggleBlocked(c)}
                      >
                        {c.isBlocked ? t("customers.unblock") : t("customers.block")}
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Drawer
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title={t("customers.detailTitle")}
        width="min(480px, 100vw)"
        footer={
          detail && isSuperAdmin ? (
            <Button
              variant={detail.customer.isBlocked ? "secondary" : "danger"}
              onClick={() => void onToggleBlocked(detail.customer)}
            >
              {detail.customer.isBlocked ? t("customers.unblock") : t("customers.block")}
            </Button>
          ) : undefined
        }
      >
        {detailLoading || !detail ? (
          <div className="dashboard-loader" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{detail.customer.name}</span>
                {statusBadge(detail.customer.isBlocked)}
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--fz-text-muted)" }}>{t("customers.phone")}: </span>
                <span dir="ltr">{detail.customer.phone}</span>
              </div>
              {detail.customer.email && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: "var(--fz-text-muted)" }}>{t("customers.email")}: </span>
                  <span dir="ltr">{detail.customer.email}</span>
                </div>
              )}
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--fz-text-muted)" }}>{t("customers.colJoined")}: </span>
                {formatDateTime(detail.customer.createdAt, lang)}
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--fz-text-muted)" }}>{t("customers.lastLogin")}: </span>
                {detail.customer.lastLoginAt
                  ? formatDateTime(detail.customer.lastLoginAt, lang)
                  : t("customers.never")}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                {t("customers.orderHistory")}
              </div>
              {detail.orders.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--fz-text-muted)" }}>
                  {t("customers.orderHistoryEmpty")}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {detail.orders.map((o) => (
                    <div
                      key={o.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        borderBottom: "1px solid var(--fz-border)",
                        paddingBottom: 8,
                      }}
                    >
                      <div>
                        <Link to={`/admin/orders/${o.id}`} onClick={() => setDetailId(null)}>
                          {o.orderNumber}
                        </Link>
                        <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
                          {formatDateTime(o.createdAt, lang)}
                          {" · "}
                          {formatInt(o.itemCount, lang)} × {formatIQD(o.total, lang)}
                        </div>
                      </div>
                      <Badge tone={STATUS_TONE[o.status]}>{t(statusKey(o.status))}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

export default DashboardCustomersPage;
