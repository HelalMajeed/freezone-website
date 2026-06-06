/**
 * Notifications inbox — full-page list over the frozen contract (e):
 * pagination, unread-only / type filters, per-item + bulk mark-read, and
 * deep-link navigation via each row's `href`.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Mail, Package, ShieldAlert, Truck } from "lucide-react";
import {
  notificationsApi,
  type NotificationItem,
  type NotificationsResponse,
} from "@/lib/dashboard/api";
import { useDashboardLocale, type DashboardMessageKey } from "@/lib/dashboard/i18n";
import { formatDateTime } from "@/lib/dashboard/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Pagination,
  Select,
  useToast,
} from "@/components/dashboard/ui";
import s from "./Notifications.module.css";

const TYPE_KEYS: Array<{ value: string; key: DashboardMessageKey }> = [
  { value: "order.created", key: "notifPage.typeOrderCreated" },
  { value: "order.cancelled", key: "notifPage.typeOrderCancelled" },
  { value: "stock.low", key: "notifPage.typeStockLow" },
  { value: "stock.out", key: "notifPage.typeStockOut" },
  { value: "review.pending", key: "notifPage.typeReviewPending" },
  { value: "contact.message", key: "notifPage.typeContactMessage" },
  { value: "system", key: "notifPage.typeSystem" },
];

function typeIcon(type: string) {
  if (type.startsWith("order.")) return <Truck size={16} aria-hidden />;
  if (type.startsWith("stock.")) return <Package size={16} aria-hidden />;
  if (type === "review.pending") return <ShieldAlert size={16} aria-hidden />;
  if (type === "contact.message") return <Mail size={16} aria-hidden />;
  return <Bell size={16} aria-hidden />;
}

export function DashboardNotificationsPage() {
  const { lang, t, formatError } = useDashboardLocale();
  const toast = useToast();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState("");

  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await notificationsApi.list({
        page,
        pageSize,
        unreadOnly: unreadOnly || undefined,
        type: type || undefined,
      });
      setData(res);
      setErr(null);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, unreadOnly, type, formatError]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const items: NotificationItem[] = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const onItemClick = async (item: NotificationItem) => {
    if (item.readAt === null) {
      try {
        await notificationsApi.markRead({ ids: [item.id] });
        void load();
      } catch {
        /* navigation still works */
      }
    }
    if (item.href) navigate(item.href);
  };

  const onMarkAll = async () => {
    setMarking(true);
    try {
      const res = await notificationsApi.markRead({ all: true });
      toast.success(t("notifPage.markedRead", { count: res.updated }));
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setMarking(false);
    }
  };

  const onMarkOne = async (item: NotificationItem) => {
    try {
      await notificationsApi.markRead({ ids: [item.id] });
      await load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{t("notifPage.title")}</h1>
          <div className="dashboard-page-subtitle">{t("notifPage.subtitle")}</div>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={() => void onMarkAll()} loading={marking}>
            <CheckCheck size={15} aria-hidden /> {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      <Card tight>
        <div className={s.filterBar}>
          <span className={s.typeSelect}>
            <Select
              value={type}
              onChange={(e) => {
                setPage(1);
                setType((e.target as HTMLSelectElement).value);
              }}
              options={[
                { value: "", label: t("notifPage.allTypes") },
                ...TYPE_KEYS.map((tk) => ({ value: tk.value, label: t(tk.key) })),
              ]}
              aria-label={t("notifPage.allTypes")}
            />
          </span>
          <label className={s.unreadToggle}>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setPage(1);
                setUnreadOnly(e.target.checked);
              }}
            />
            <span>{t("notifPage.unreadOnly")}</span>
          </label>
          {unreadCount > 0 && (
            <span className={s.filterEnd}>
              <Badge tone="brand">{t("notifications.unread", { count: unreadCount })}</Badge>
            </span>
          )}
        </div>

        {loading && !data ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <EmptyState
            icon={<Bell size={26} />}
            title={t("notifications.error")}
            description={err}
            action={
              <Button variant="secondary" onClick={() => void load()}>
                {t("common.retry")}
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bell size={26} />}
            title={t("notifications.empty")}
            description={t("notifications.emptyHint")}
          />
        ) : (
          <>
            <div className={s.list} role="list">
              {items.map((item) => {
                const title =
                  lang === "ar" ? item.titleAr || item.titleEn : item.titleEn || item.titleAr;
                const body =
                  lang === "ar" ? item.bodyAr || item.bodyEn : item.bodyEn || item.bodyAr;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className={[s.item, item.readAt === null && s.itemUnread]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => void onItemClick(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void onItemClick(item);
                      }
                    }}
                  >
                    <span className={s.itemIcon}>{typeIcon(item.type)}</span>
                    <div className={s.itemBody}>
                      <span className={s.itemTitle}>{title}</span>
                      {body && <div className={s.itemText}>{body}</div>}
                      <div className={s.itemTime}>{formatDateTime(item.createdAt, lang)}</div>
                    </div>
                    <span className={s.itemEnd}>
                      {item.readAt === null && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onMarkOne(item);
                          }}
                        >
                          {t("notifications.markRead")}
                        </Button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={s.footer}>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={data?.total ?? items.length}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                  setPage(1);
                  setPageSize(next);
                }}
              />
            </div>
          </>
        )}
      </Card>
    </>
  );
}

export default DashboardNotificationsPage;
