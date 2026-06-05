import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  dashboardApi,
  DashboardApiError,
  type Order,
  type OrderStatus,
} from "@/lib/dashboard/api";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Table,
} from "@/components/dashboard/ui";

type Lang = "ar" | "en";

const STATUS_VALUES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
};

const STATUS_LABELS: Record<OrderStatus, { en: string; ar: string }> = {
  pending: { en: "Pending", ar: "بانتظار" },
  confirmed: { en: "Confirmed", ar: "مؤكَّد" },
  processing: { en: "Processing", ar: "قيد التجهيز" },
  shipped: { en: "Shipped", ar: "شُحن" },
  delivered: { en: "Delivered", ar: "سُلِّم" },
  cancelled: { en: "Cancelled", ar: "ملغى" },
};

function formatCurrency(amount: number, lang: Lang): string {
  const locale = lang === "ar" ? "ar-IQ" : "en-IQ";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IQD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(lang === "ar" ? "ar-IQ" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

export function DashboardOrdersPage() {
  const { i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en") as Lang;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const load = () => {
    setLoading(true);
    dashboardApi
      .get<Order[]>("/api/admin/orders")
      .then((d) => {
        setOrders(d);
        setErr(null);
      })
      .catch((e) =>
        setErr(e instanceof DashboardApiError ? e.code : (e as Error).message),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        (o.customerEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const counts = useMemo(() => {
    const map = new Map<OrderStatus, number>();
    for (const o of orders) map.set(o.status, (map.get(o.status) ?? 0) + 1);
    return map;
  }, [orders]);

  const onStatusChange = async (order: Order, status: OrderStatus) => {
    if (status === order.status) return;
    setSavingStatus(true);
    try {
      await dashboardApi.patch("/api/admin/orders", { id: order.id, status });
      const updated = { ...order, status };
      setOpenOrder(updated);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (e) {
      window.alert(e instanceof DashboardApiError ? e.code : (e as Error).message);
    } finally {
      setSavingStatus(false);
    }
  };

  const statusOptions = [
    { value: "", label: lang === "ar" ? "كل الحالات" : "All statuses" },
    ...STATUS_VALUES.map((s) => ({
      value: s,
      label: STATUS_LABELS[s][lang],
    })),
  ];

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{lang === "ar" ? "الطلبات" : "Orders"}</h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "اعرض الطلبات الواردة، افتح تفاصيلها، وحدّث حالتها."
              : "Review incoming orders, open details, and update their lifecycle status."}
          </div>
        </div>
      </div>

      <Card tight>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 10,
            padding: 14,
            borderBottom: "1px solid var(--fz-border, #e5e7eb)",
          }}
        >
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === "ar"
                ? "ابحث برقم الطلب، اسم الزبون، الهاتف أو البريد"
                : "Search by order #, customer, phone or email"
            }
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value)}
            options={statusOptions}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "10px 16px",
            borderBottom: "1px solid var(--fz-border, #e5e7eb)",
            fontSize: 12,
          }}
        >
          {STATUS_VALUES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              style={{
                background: statusFilter === s ? "var(--fz-brand, #2563eb)" : "transparent",
                color: statusFilter === s ? "#fff" : "var(--fz-text-soft)",
                border: "1px solid var(--fz-border, #e5e7eb)",
                padding: "4px 10px",
                borderRadius: 999,
                cursor: "pointer",
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <span>{STATUS_LABELS[s][lang]}</span>
              <span style={{ opacity: 0.7 }}>{counts.get(s) ?? 0}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div style={{ padding: 20, color: "var(--fz-danger)" }}>{err}</div>
        ) : (
          <Table
            rowKey={(o) => o.id}
            rows={filtered}
            empty={
              orders.length === 0
                ? lang === "ar"
                  ? "لا توجد طلبات بعد."
                  : "No orders yet."
                : lang === "ar"
                  ? "لا نتائج مطابقة."
                  : "No matches."
            }
            columns={[
              {
                header: lang === "ar" ? "رقم الطلب" : "Order #",
                cell: (o) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{o.orderNumber}</div>
                    <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
                      {formatDate(o.createdAt, lang)}
                    </div>
                  </div>
                ),
              },
              {
                header: lang === "ar" ? "الزبون" : "Customer",
                cell: (o) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{o.customerName}</div>
                    <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
                      {o.customerPhone}
                    </div>
                  </div>
                ),
              },
              {
                header: lang === "ar" ? "المدينة" : "City",
                cell: (o) => <span style={{ fontSize: 13 }}>{o.city}</span>,
              },
              {
                header: lang === "ar" ? "العناصر" : "Items",
                width: "80px",
                cell: (o) => (
                  <span style={{ color: "var(--fz-text-soft)" }}>
                    {o.items.reduce((sum, it) => sum + it.qty, 0)}
                  </span>
                ),
              },
              {
                header: lang === "ar" ? "الإجمالي" : "Total",
                cell: (o) => <span>{formatCurrency(o.total, lang)}</span>,
              },
              {
                header: lang === "ar" ? "الحالة" : "Status",
                width: "120px",
                cell: (o) => (
                  <Badge tone={STATUS_TONE[o.status]}>
                    {STATUS_LABELS[o.status][lang]}
                  </Badge>
                ),
              },
              {
                header: "",
                cell: (o) => (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button size="sm" variant="secondary" onClick={() => setOpenOrder(o)}>
                      {lang === "ar" ? "عرض" : "View"}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        open={openOrder != null}
        onClose={() => setOpenOrder(null)}
        size="lg"
        title={openOrder ? `${lang === "ar" ? "طلب" : "Order"} ${openOrder.orderNumber}` : undefined}
        footer={
          <Button variant="ghost" onClick={() => setOpenOrder(null)}>
            {lang === "ar" ? "إغلاق" : "Close"}
          </Button>
        }
      >
        {openOrder && (
          <OrderDetail
            order={openOrder}
            lang={lang}
            savingStatus={savingStatus}
            onStatusChange={onStatusChange}
          />
        )}
      </Modal>
    </>
  );
}

function OrderDetail({
  order,
  lang,
  savingStatus,
  onStatusChange,
}: {
  order: Order;
  lang: Lang;
  savingStatus: boolean;
  onStatusChange: (o: Order, s: OrderStatus) => Promise<void>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          padding: 14,
          background: "var(--fz-bg-soft, #f8fafc)",
          borderRadius: "var(--fz-radius)",
          fontSize: 13,
        }}
      >
        <div>
          <div style={{ color: "var(--fz-text-muted)", marginBottom: 4 }}>
            {lang === "ar" ? "الزبون" : "Customer"}
          </div>
          <div style={{ fontWeight: 600 }}>{order.customerName}</div>
          <div>{order.customerPhone}</div>
          {order.customerEmail && <div>{order.customerEmail}</div>}
        </div>
        <div>
          <div style={{ color: "var(--fz-text-muted)", marginBottom: 4 }}>
            {lang === "ar" ? "العنوان" : "Address"}
          </div>
          <div>{order.city}</div>
          <div style={{ whiteSpace: "pre-line" }}>{order.addressLine}</div>
        </div>
        <div>
          <div style={{ color: "var(--fz-text-muted)", marginBottom: 4 }}>
            {lang === "ar" ? "الدفع" : "Payment"}
          </div>
          <div>{order.paymentMethod}</div>
        </div>
        <div>
          <div style={{ color: "var(--fz-text-muted)", marginBottom: 4 }}>
            {lang === "ar" ? "التسليم" : "Fulfillment"}
          </div>
          <div>{order.fulfillment}</div>
        </div>
        {order.couponCode && (
          <div>
            <div style={{ color: "var(--fz-text-muted)", marginBottom: 4 }}>
              {lang === "ar" ? "كوبون" : "Coupon"}
            </div>
            <div style={{ fontFamily: "monospace" }}>{order.couponCode}</div>
          </div>
        )}
        {order.notes && (
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ color: "var(--fz-text-muted)", marginBottom: 4 }}>
              {lang === "ar" ? "ملاحظات" : "Notes"}
            </div>
            <div style={{ whiteSpace: "pre-line" }}>{order.notes}</div>
          </div>
        )}
      </div>

      <div>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          {lang === "ar" ? "المنتجات" : "Items"}
        </div>
        <div
          style={{
            border: "1px solid var(--fz-border, #e5e7eb)",
            borderRadius: "var(--fz-radius)",
            overflow: "hidden",
          }}
        >
          {order.items.map((it, i) => (
            <div
              key={it.id}
              style={{
                display: "flex",
                gap: 10,
                padding: 10,
                borderTop: i === 0 ? undefined : "1px solid var(--fz-border, #e5e7eb)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: "var(--fz-bg-soft, #f1f5f9)",
                  border: "1px solid var(--fz-border, #e5e7eb)",
                  overflow: "hidden",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {it.imageSnapshot ? (
                  <img
                    src={resolveImage(it.imageSnapshot)}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <span>📦</span>
                )}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{it.nameSnapshot}</div>
                <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
                  {it.qty} × {formatCurrency(it.priceSnapshot, lang)}
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {formatCurrency(it.priceSnapshot * it.qty, lang)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: 14,
          background: "var(--fz-bg-soft, #f8fafc)",
          borderRadius: "var(--fz-radius)",
          fontSize: 13,
        }}
      >
        <Row label={lang === "ar" ? "المجموع الفرعي" : "Subtotal"} value={formatCurrency(order.subtotal, lang)} />
        <Row label={lang === "ar" ? "الشحن" : "Shipping"} value={formatCurrency(order.shipping, lang)} />
        {order.discountTotal > 0 && (
          <Row
            label={lang === "ar" ? "الخصم" : "Discount"}
            value={`− ${formatCurrency(order.discountTotal, lang)}`}
          />
        )}
        <Row
          label={lang === "ar" ? "الإجمالي" : "Total"}
          value={formatCurrency(order.total, lang)}
          bold
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 14,
          border: "1px solid var(--fz-border, #e5e7eb)",
          borderRadius: "var(--fz-radius)",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13 }}>
          {lang === "ar" ? "الحالة:" : "Status:"}
        </div>
        <div style={{ flex: 1 }}>
          <Select
            value={order.status}
            onChange={(e) =>
              onStatusChange(order, (e.target as HTMLSelectElement).value as OrderStatus)
            }
            disabled={savingStatus}
            options={STATUS_VALUES.map((s) => ({
              value: s,
              label: STATUS_LABELS[s][lang],
            }))}
          />
        </div>
        {savingStatus && (
          <span style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
            {lang === "ar" ? "جارٍ الحفظ…" : "Saving…"}
          </span>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontWeight: bold ? 700 : 400,
        fontSize: bold ? 15 : 13,
        padding: bold ? "6px 0 0" : undefined,
        borderTop: bold ? "1px solid var(--fz-border, #e5e7eb)" : undefined,
        marginTop: bold ? 6 : undefined,
      }}
    >
      <span style={{ color: bold ? "inherit" : "var(--fz-text-soft)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default DashboardOrdersPage;
