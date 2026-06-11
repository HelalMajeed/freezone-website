/**
 * Order detail — frozen contract (b)/(c):
 *  - customer + line items (links to catalog, tolerant of deleted products),
 *  - status timeline from `statusHistory` + transition control (PATCH),
 *  - cancel-with-restock through POST /cancel behind a confirm dialog,
 *  - internal notes thread, manual shipping-fee edit (PATCH { shipping }),
 *  - customer order history (same phone), printable invoice (react-to-print).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { ArrowLeft, ArrowRight, Package, Pencil, Printer } from "lucide-react";
import {
  ordersApi,
  type OrderDetail,
  type OrderListRow,
  type OrderStatus,
  type OrderStatusEvent,
} from "@/lib/dashboard/api";
import { ordersExtraApi } from "@/lib/dashboard/api-extra";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import { formatDateTime, formatIQD } from "@/lib/dashboard/format";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/dashboard/ui";
import {
  normalizePaymentStatus,
  ORDER_STATUSES,
  PAYMENT_STATUS_TONE,
  PAYMENT_STATUSES,
  paymentKey,
  paymentStatusKey,
  statusKey,
  STATUS_TONE,
  type PaymentStatusValue,
} from "./order-shared";
import s from "./OrderDetail.module.css";

function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

const TRANSITION_TARGETS = ORDER_STATUSES.filter(
  (st): st is Exclude<OrderStatus, "cancelled"> => st !== "cancelled",
);

export function DashboardOrderDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const orderId = Number(idParam);
  const { lang, t, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [history, setHistory] = useState<OrderListRow[] | null>(null);

  const [nextStatus, setNextStatus] = useState<Exclude<OrderStatus, "cancelled"> | "">("");
  const [savingStatus, setSavingStatus] = useState(false);

  const [nextPaymentStatus, setNextPaymentStatus] = useState<PaymentStatusValue | "">("");
  const [savingPayment, setSavingPayment] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingValue, setShippingValue] = useState("");
  const [savingShipping, setSavingShipping] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [restoreStock, setRestoreStock] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const invoiceRef = useRef<HTMLDivElement | null>(null);
  const printInvoice = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: order ? `invoice-${order.orderNumber}` : "invoice",
  });

  const load = useCallback(async () => {
    if (!Number.isFinite(orderId)) {
      setErr(t("orderDetail.notFound"));
      setLoading(false);
      return;
    }
    try {
      const detail = await ordersApi.detail(orderId);
      setOrder(detail);
      setErr(null);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setLoading(false);
    }
  }, [orderId, formatError, t]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Customer order history — other orders matching the phone number.
  useEffect(() => {
    if (!order?.customerPhone) return;
    let alive = true;
    ordersApi
      .list({ search: order.customerPhone, pageSize: 25 })
      .then((res) => {
        if (!alive) return;
        setHistory(res.items.filter((o) => o.id !== order.id));
      })
      .catch(() => {
        if (alive) setHistory([]);
      });
    return () => {
      alive = false;
    };
  }, [order?.customerPhone, order?.id]);

  const timeline = useMemo(() => {
    if (!order) return [];
    const created: OrderStatusEvent = {
      id: 0,
      kind: "status",
      fromStatus: null,
      toStatus: "pending",
      note: null,
      userId: null,
      userEmail: null,
      createdAt: order.createdAt,
    };
    return [created, ...order.statusHistory];
  }, [order]);

  const onUpdateStatus = async () => {
    if (!order || !nextStatus || nextStatus === order.status) return;
    setSavingStatus(true);
    try {
      await ordersApi.updateStatus(order.id, nextStatus);
      toast.success(t("orderDetail.statusUpdated", { status: t(statusKey(nextStatus)) }));
      setNextStatus("");
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSavingStatus(false);
    }
  };

  const onUpdatePaymentStatus = async () => {
    if (!order || !nextPaymentStatus) return;
    const current = normalizePaymentStatus(
      (order as OrderDetail & { paymentStatus?: string }).paymentStatus,
    );
    if (nextPaymentStatus === current) return;
    const label = t(paymentStatusKey(nextPaymentStatus));
    const sure = await confirm({
      title: t("orderDetail.paymentStatusConfirmTitle"),
      message: t("orderDetail.paymentStatusConfirmMessage", {
        number: order.orderNumber,
        status: label,
      }),
      confirmLabel: t("orderDetail.updatePaymentStatus"),
    });
    if (!sure) return;
    setSavingPayment(true);
    try {
      // PATCH { paymentStatus } per API_CONTRACT §6 (server change ships with
      // the payments stream); the server records a timeline note.
      await ordersExtraApi.updatePaymentStatus(order.id, nextPaymentStatus);
      toast.success(t("orderDetail.paymentStatusUpdated", { status: label }));
      setNextPaymentStatus("");
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSavingPayment(false);
    }
  };

  const onAddNote = async () => {
    if (!order || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await ordersApi.addNote(order.id, noteText.trim());
      setNoteText("");
      toast.success(t("orderDetail.noteAdded"));
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSavingNote(false);
    }
  };

  const onSaveShipping = async () => {
    if (!order) return;
    const value = Number(shippingValue);
    if (!Number.isInteger(value) || value < 0) return;
    setSavingShipping(true);
    try {
      await ordersExtraApi.updateShipping(order.id, value);
      toast.success(t("orderDetail.shippingSaved"));
      setEditingShipping(false);
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSavingShipping(false);
    }
  };

  const onCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const res = await ordersApi.cancel(order.id, {
        reason: cancelReason.trim() || undefined,
        restoreStock,
      });
      const restored = res.stockRestored.length;
      toast.success(
        restored > 0
          ? t("orderDetail.stockRestored", { count: restored })
          : t("orderDetail.stockNotRestored"),
        t("orderDetail.cancelled"),
      );
      setCancelOpen(false);
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="dashboard-loader" />;

  if (err || !order) {
    return (
      <Card>
        <EmptyState
          icon={<Package size={26} />}
          title={err ?? t("orderDetail.notFound")}
          action={
            <Link to="/admin/orders">
              <Button variant="secondary">{t("orderDetail.backToOrders")}</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const cancellable = order.status !== "cancelled" && order.status !== "delivered";
  const payKey = paymentKey(order.paymentMethod);
  const paymentStatus = normalizePaymentStatus(
    (order as OrderDetail & { paymentStatus?: string }).paymentStatus,
  );
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <Link to="/admin/orders" className={s.backLink}>
            <BackIcon size={14} aria-hidden /> {t("orderDetail.backToOrders")}
          </Link>
          <div className={s.titleRow}>
            <h1 className="dashboard-page-title">
              {t("orderDetail.title", { number: order.orderNumber })}
            </h1>
            <Badge tone={STATUS_TONE[order.status]}>{t(statusKey(order.status))}</Badge>
            <Badge tone={PAYMENT_STATUS_TONE[paymentStatus]}>
              {t(paymentStatusKey(paymentStatus))}
            </Badge>
          </div>
          <div className="dashboard-page-subtitle">{formatDateTime(order.createdAt, lang)}</div>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" onClick={() => printInvoice()}>
            <Printer size={15} aria-hidden /> {t("orderDetail.printInvoice")}
          </Button>
        </div>
      </div>

      <div className={s.grid}>
        {/* ── Main column ── */}
        <div className={s.mainCol}>
          <Card title={t("orderDetail.items")}>
            {order.items.map((item) => (
              <div key={item.id} className={s.itemRow}>
                <span className={s.itemThumb}>
                  {item.imageSnapshot ? (
                    <img src={resolveImage(item.imageSnapshot)} alt="" />
                  ) : (
                    <Package size={18} aria-hidden />
                  )}
                </span>
                <div className={s.itemInfo}>
                  <div className={s.itemName}>
                    {item.product ? (
                      <Link
                        to={`/admin/products?search=${encodeURIComponent(
                          item.product.nameEn || item.nameSnapshot,
                        )}`}
                      >
                        {lang === "ar"
                          ? item.product.nameAr || item.product.nameEn
                          : item.product.nameEn || item.product.nameAr}
                      </Link>
                    ) : (
                      <>
                        {item.nameSnapshot}{" "}
                        <Badge tone="neutral">{t("orderDetail.deletedProduct")}</Badge>
                      </>
                    )}
                  </div>
                  <div className={s.itemMeta}>
                    {item.qty} × {formatIQD(item.priceSnapshot, lang)}
                  </div>
                </div>
                <div className={s.itemTotal}>{formatIQD(item.priceSnapshot * item.qty, lang)}</div>
              </div>
            ))}

            <div className={s.totals}>
              <div className={s.totalsRow}>
                <span>{t("orderDetail.subtotal")}</span>
                <span>{formatIQD(order.subtotal, lang)}</span>
              </div>
              <div className={s.totalsRow}>
                <span>{t("orderDetail.shipping")}</span>
                {editingShipping ? (
                  <span className={s.shippingEdit}>
                    <input
                      type="number"
                      min={0}
                      step={250}
                      className={s.shippingInput}
                      value={shippingValue}
                      onChange={(e) => setShippingValue(e.target.value)}
                      aria-label={t("orderDetail.shippingLabel")}
                    />
                    <Button size="sm" onClick={() => void onSaveShipping()} loading={savingShipping}>
                      {t("common.save")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingShipping(false)}
                      disabled={savingShipping}
                    >
                      {t("common.cancel")}
                    </Button>
                  </span>
                ) : (
                  <span className={s.shippingEdit}>
                    <span>{formatIQD(order.shipping, lang)}</span>
                    {order.status !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        iconOnly
                        aria-label={t("orderDetail.editShipping")}
                        title={t("orderDetail.editShipping")}
                        onClick={() => {
                          setShippingValue(String(order.shipping));
                          setEditingShipping(true);
                        }}
                      >
                        <Pencil size={13} aria-hidden />
                      </Button>
                    )}
                  </span>
                )}
              </div>
              {order.discountTotal > 0 && (
                <div className={s.totalsRow}>
                  <span>
                    {t("orderDetail.discount")}
                    {order.couponCode ? ` (${order.couponCode})` : ""}
                  </span>
                  <span>− {formatIQD(order.discountTotal, lang)}</span>
                </div>
              )}
              <div className={`${s.totalsRow} ${s.totalsGrand}`}>
                <span>{t("orderDetail.total")}</span>
                <span>{formatIQD(order.total, lang)}</span>
              </div>
            </div>
          </Card>

          <Card title={t("orderDetail.timeline")}>
            {timeline.length === 0 ? (
              <div className={s.historyMeta}>{t("orderDetail.timelineEmpty")}</div>
            ) : (
              <div className={s.timeline}>
                {timeline.map((event) => (
                  <div key={`${event.id}-${event.createdAt}`} className={s.timelineItem}>
                    <span className={s.timelineDot} aria-hidden />
                    <div className={s.timelineTitle}>
                      {event.fromStatus === null && event.id === 0 ? (
                        <span>{t("orderDetail.timelineCreated")}</span>
                      ) : (
                        <>
                          {event.fromStatus && (
                            <Badge tone={STATUS_TONE[event.fromStatus]}>
                              {t(statusKey(event.fromStatus))}
                            </Badge>
                          )}
                          <span aria-hidden>{lang === "ar" ? "←" : "→"}</span>
                          {event.toStatus && (
                            <Badge tone={STATUS_TONE[event.toStatus]}>
                              {t(statusKey(event.toStatus))}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    <div className={s.timelineMeta}>
                      {formatDateTime(event.createdAt, lang)}
                      {event.userEmail ? ` · ${event.userEmail}` : ""}
                    </div>
                    {event.note && <div className={s.timelineNote}>{event.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={t("orderDetail.internalNotes")}>
            <div className={s.sectionHint}>{t("orderDetail.internalNotesHint")}</div>
            <div className={s.noteList}>
              {order.internalNotes.length === 0 ? (
                <div className={s.historyMeta}>{t("orderDetail.notesEmpty")}</div>
              ) : (
                order.internalNotes.map((note) => (
                  <div key={note.id} className={s.noteItem}>
                    <div className={s.noteText}>{note.note}</div>
                    <div className={s.noteMeta}>
                      {formatDateTime(note.createdAt, lang)}
                      {note.userEmail ? ` · ${note.userEmail}` : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className={s.noteForm}>
              <Textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t("orderDetail.notePlaceholder")}
                maxLength={2000}
              />
              <div className={s.noteFormActions}>
                <Button
                  size="sm"
                  onClick={() => void onAddNote()}
                  loading={savingNote}
                  disabled={!noteText.trim()}
                >
                  {t("orderDetail.addNote")}
                </Button>
              </div>
            </div>
          </Card>

          <Card title={t("orderDetail.customerHistory")}>
            <div className={s.sectionHint}>{t("orderDetail.customerHistoryHint")}</div>
            {history === null ? (
              <div className={s.historyMeta}>{t("common.loading")}</div>
            ) : history.length === 0 ? (
              <div className={s.historyMeta}>{t("orderDetail.customerHistoryEmpty")}</div>
            ) : (
              history.map((row) => (
                <div key={row.id} className={s.historyRow}>
                  <div>
                    <Link to={`/admin/orders/${row.id}`} className={s.historyLink}>
                      {row.orderNumber}
                    </Link>
                    <div className={s.historyMeta}>{formatDateTime(row.createdAt, lang)}</div>
                  </div>
                  <div className={s.historyEnd}>
                    <span className={s.itemTotal}>{formatIQD(row.total, lang)}</span>
                    <Badge tone={STATUS_TONE[row.status]}>{t(statusKey(row.status))}</Badge>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* ── End rail ── */}
        <div className={s.railCol}>
          <Card title={t("orderDetail.statusControl")}>
            <div className={s.statusControl}>
              <div className={s.statusRow}>
                <Select
                  value={nextStatus || order.status}
                  onChange={(e) =>
                    setNextStatus(
                      (e.target as HTMLSelectElement).value as Exclude<OrderStatus, "cancelled">,
                    )
                  }
                  disabled={order.status === "cancelled"}
                  options={[
                    ...(order.status === "cancelled"
                      ? [{ value: "cancelled", label: t(statusKey("cancelled")) }]
                      : []),
                    ...TRANSITION_TARGETS.map((st) => ({ value: st, label: t(statusKey(st)) })),
                  ]}
                  aria-label={t("orderDetail.statusControl")}
                />
                <Button
                  onClick={() => void onUpdateStatus()}
                  loading={savingStatus}
                  disabled={!nextStatus || nextStatus === order.status}
                >
                  {t("orderDetail.updateStatus")}
                </Button>
              </div>
              {cancellable && (
                <div className={s.cancelBox}>
                  <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                    {t("orderDetail.cancelOrder")}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card title={t("orderDetail.paymentStatus")}>
            <div className={s.statusControl}>
              <div className={s.statusRow}>
                <Select
                  value={nextPaymentStatus || paymentStatus}
                  onChange={(e) =>
                    setNextPaymentStatus(
                      (e.target as HTMLSelectElement).value as PaymentStatusValue,
                    )
                  }
                  options={PAYMENT_STATUSES.map((ps) => ({
                    value: ps,
                    label: t(paymentStatusKey(ps)),
                  }))}
                  aria-label={t("orderDetail.paymentStatus")}
                />
                <Button
                  onClick={() => void onUpdatePaymentStatus()}
                  loading={savingPayment}
                  disabled={!nextPaymentStatus || nextPaymentStatus === paymentStatus}
                >
                  {t("orderDetail.updatePaymentStatus")}
                </Button>
              </div>
            </div>
          </Card>

          <Card title={t("orderDetail.customer")}>
            <div className={s.metaList}>
              <div>
                <div className={s.metaLabel}>{t("orderDetail.customer")}</div>
                <div className={s.metaValue}>{order.customerName}</div>
                <div className={s.metaValue} dir="ltr">
                  {order.customerPhone}
                </div>
                {order.customerEmail && (
                  <div className={s.metaValue} dir="ltr">
                    {order.customerEmail}
                  </div>
                )}
              </div>
              <div>
                <div className={s.metaLabel}>{t("orderDetail.address")}</div>
                <div className={s.metaValue}>
                  {order.city}
                  {order.addressLine ? `\n${order.addressLine}` : ""}
                </div>
              </div>
              <div>
                <div className={s.metaLabel}>{t("orderDetail.payment")}</div>
                <div className={s.metaValue}>{payKey ? t(payKey) : order.paymentMethod}</div>
              </div>
              <div>
                <div className={s.metaLabel}>{t("orderDetail.fulfillment")}</div>
                <div className={s.metaValue}>{order.fulfillment}</div>
              </div>
              {order.couponCode && (
                <div>
                  <div className={s.metaLabel}>{t("orderDetail.coupon")}</div>
                  <div className={s.metaValue} dir="ltr">
                    {order.couponCode}
                  </div>
                </div>
              )}
              {order.notes && (
                <div>
                  <div className={s.metaLabel}>{t("orderDetail.customerNotes")}</div>
                  <div className={s.metaValue}>{order.notes}</div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Cancel-with-restock dialog ── */}
      <Modal
        open={cancelOpen}
        onClose={() => !cancelling && setCancelOpen(false)}
        size="sm"
        title={t("orderDetail.cancelTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              {t("orderDetail.keepOrder")}
            </Button>
            <Button variant="danger" onClick={() => void onCancelOrder()} loading={cancelling}>
              {t("orderDetail.confirmCancel")}
            </Button>
          </>
        }
      >
        <div className={s.cancelFields}>
          <div>{t("orderDetail.cancelMessage")}</div>
          <Field label={t("orderDetail.cancelReason")}>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t("orderDetail.cancelReasonPlaceholder")}
              maxLength={500}
            />
          </Field>
          <label className={s.checkboxRow}>
            <input
              type="checkbox"
              checked={restoreStock}
              onChange={(e) => setRestoreStock(e.target.checked)}
            />
            <span>{t("orderDetail.restoreStock")}</span>
          </label>
        </div>
      </Modal>

      {/* ── Printable invoice (off-screen; cloned by react-to-print) ── */}
      <div className={s.invoiceHolder} aria-hidden>
        <div ref={invoiceRef} className={s.invoice} dir={lang === "ar" ? "rtl" : "ltr"}>
          <div className={s.invoiceHead}>
            <div>
              <div className={s.invoiceBrand}>FreeZone</div>
              <div>freezone-iq.com</div>
            </div>
            <div>
              <div className={s.invoiceTitle}>{t("orderDetail.invoice")}</div>
              <div className={s.invoiceNum} dir="ltr">
                {order.orderNumber}
              </div>
            </div>
          </div>

          <div className={s.invoiceMetaGrid}>
            <div>
              <div className={s.invoiceMetaLabel}>{t("orderDetail.customer")}</div>
              <div>{order.customerName}</div>
              <div dir="ltr">{order.customerPhone}</div>
              <div>
                {order.city}
                {order.addressLine ? ` — ${order.addressLine}` : ""}
              </div>
            </div>
            <div>
              <div className={s.invoiceMetaLabel}>{t("orderDetail.invoiceOrder")}</div>
              <div dir="ltr">{order.orderNumber}</div>
              <div className={`${s.invoiceMetaLabel} ${s.invoiceMetaSpaced}`}>
                {t("orderDetail.invoiceDate")}
              </div>
              <div>{formatDateTime(order.createdAt, lang)}</div>
              <div className={`${s.invoiceMetaLabel} ${s.invoiceMetaSpaced}`}>
                {t("orderDetail.payment")}
              </div>
              <div>{payKey ? t(payKey) : order.paymentMethod}</div>
            </div>
          </div>

          <table className={s.invoiceTable}>
            <thead>
              <tr>
                <th>{t("orderDetail.invoiceItem")}</th>
                <th className={s.invoiceNum}>{t("orderDetail.invoiceQty")}</th>
                <th className={s.invoiceNum}>{t("orderDetail.invoicePrice")}</th>
                <th className={s.invoiceNum}>{t("orderDetail.invoiceLineTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.nameSnapshot}</td>
                  <td className={s.invoiceNum}>{item.qty}</td>
                  <td className={s.invoiceNum}>{formatIQD(item.priceSnapshot, lang)}</td>
                  <td className={s.invoiceNum}>
                    {formatIQD(item.priceSnapshot * item.qty, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={s.invoiceTotals}>
            <div className={s.invoiceTotalsRow}>
              <span>{t("orderDetail.subtotal")}</span>
              <span className={s.invoiceNum}>{formatIQD(order.subtotal, lang)}</span>
            </div>
            <div className={s.invoiceTotalsRow}>
              <span>{t("orderDetail.shipping")}</span>
              <span className={s.invoiceNum}>{formatIQD(order.shipping, lang)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className={s.invoiceTotalsRow}>
                <span>
                  {t("orderDetail.discount")}
                  {order.couponCode ? ` (${order.couponCode})` : ""}
                </span>
                <span className={s.invoiceNum}>− {formatIQD(order.discountTotal, lang)}</span>
              </div>
            )}
            <div className={`${s.invoiceTotalsRow} ${s.invoiceGrand}`}>
              <span>{t("orderDetail.total")}</span>
              <span className={s.invoiceNum}>{formatIQD(order.total, lang)}</span>
            </div>
          </div>

          <div className={s.invoiceFooter}>{t("orderDetail.invoiceThanks")}</div>
        </div>
      </div>
    </>
  );
}

export default DashboardOrderDetailPage;
