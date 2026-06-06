/**
 * Review queue — products with catalogStatus PENDING_REVIEW, oldest submission
 * first. Managers approve (publish) or send back with notes; notes also land
 * in the product comment thread.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, Package } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  Table,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import { reviewQueueApi, type ReviewQueueItem } from "@/lib/dashboard/api-extra";
import { formatIqd, resolveUploadUrl } from "./shared";
import s from "../products.module.css";

const PAGE_SIZE = 25;

export function DashboardReviewQueuePage() {
  const { t, lang, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [changesFor, setChangesFor] = useState<ReviewQueueItem | null>(null);
  const [notes, setNotes] = useState("");
  const [sendingNotes, setSendingNotes] = useState(false);

  const localeRef = useRef({ formatError, toast });
  localeRef.current = { formatError, toast };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewQueueApi.list({ page, pageSize: PAGE_SIZE });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      localeRef.current.toast.error(localeRef.current.formatError(e));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const itemName = (item: ReviewQueueItem) =>
    lang === "ar" ? item.nameAr || item.nameEn : item.nameEn;

  const approve = async (item: ReviewQueueItem) => {
    const ok = await confirm({
      title: t("review.approveTitle"),
      message: t("review.approveMessage", { name: itemName(item) }),
      confirmLabel: t("review.approve"),
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await reviewQueueApi.decide(item.id, "publish");
      toast.success(t("review.approvedToast"));
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusyId(null);
    }
  };

  const sendChanges = async () => {
    if (!changesFor) return;
    if (!notes.trim()) {
      toast.error(t("review.notesRequired"));
      return;
    }
    setSendingNotes(true);
    try {
      await reviewQueueApi.decide(changesFor.id, "changes_requested", notes);
      toast.success(t("review.changesToast"));
      setChangesFor(null);
      setNotes("");
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSendingNotes(false);
    }
  };

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(lang === "ar" ? "ar-IQ" : "en-IQ", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{t("review.title")}</h1>
          <div className="dashboard-page-subtitle">{t("review.subtitle")}</div>
        </div>
        <Button variant="secondary" onClick={() => void load()}>
          {t("common.refresh")}
        </Button>
      </div>

      <Card tight>
        {loading ? (
          <div className="dashboard-loader" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={26} aria-hidden />}
            title={t("review.empty")}
            action={
              <Link to="/dashboard/products">
                <Button variant="secondary">{t("editor.backToList")}</Button>
              </Link>
            }
          />
        ) : (
          <Table
            rowKey={(r) => r.id}
            rows={items}
            pagination={{
              page,
              pageSize: PAGE_SIZE,
              total,
              onPageChange: setPage,
            }}
            columns={[
              {
                header: "",
                width: "60px",
                cell: (r) => (
                  <span className={s.thumb}>
                    {r.images[0]?.url ? (
                      <img src={resolveUploadUrl(r.images[0].url)} alt={r.nameEn} />
                    ) : (
                      <Package size={18} aria-hidden />
                    )}
                  </span>
                ),
              },
              {
                header: t("review.colProduct"),
                cell: (r) => (
                  <div>
                    <Link to={`/dashboard/products/${r.id}`} className={s.cellTitle}>
                      {itemName(r)}
                    </Link>
                    <div className={s.cellSub}>
                      #{r.id}
                      {r.sku && r.sku !== "—" ? ` · SKU ${r.sku}` : ""}
                    </div>
                  </div>
                ),
              },
              {
                header: t("review.colCategory"),
                cell: (r) => (
                  <span className={s.cellSoft}>
                    {r.category ? (lang === "ar" ? r.category.nameAr : r.category.nameEn) : "—"}
                  </span>
                ),
              },
              {
                header: t("review.colPrice"),
                align: "end",
                mono: true,
                cell: (r) => formatIqd(r.price, lang),
              },
              {
                header: t("review.colStock"),
                align: "end",
                mono: true,
                width: "80px",
                cell: (r) => r.quantity,
              },
              {
                header: t("review.colSubmitted"),
                cell: (r) => <span className={s.cellSoft}>{formatDate(r.submittedAt)}</span>,
              },
              {
                header: "",
                cell: (r) => (
                  <div className={s.rowActions}>
                    <Button
                      size="sm"
                      loading={busyId === r.id}
                      onClick={() => void approve(r)}
                    >
                      {t("review.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setChangesFor(r);
                        setNotes("");
                      }}
                    >
                      {t("review.requestChanges")}
                    </Button>
                    <Link to={`/dashboard/products/${r.id}`}>
                      <Button size="sm" variant="ghost">
                        {t("review.openEditor")}
                      </Button>
                    </Link>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Drawer
        open={changesFor !== null}
        onClose={() => setChangesFor(null)}
        title={t("review.changesTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setChangesFor(null)}>
              {t("common.cancel")}
            </Button>
            <Button loading={sendingNotes} onClick={() => void sendChanges()}>
              {t("review.requestChanges")}
            </Button>
          </>
        }
      >
        {changesFor && (
          <>
            <div className={s.statusCell}>
              <Badge tone="warning">{t("products.statusPENDING_REVIEW")}</Badge>
              <strong>{itemName(changesFor)}</strong>
            </div>
            <Field label={t("review.notesLabel")}>
              <Textarea
                rows={6}
                value={notes}
                placeholder={t("review.notesPlaceholder")}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </>
        )}
      </Drawer>
    </>
  );
}

export default DashboardReviewQueuePage;
