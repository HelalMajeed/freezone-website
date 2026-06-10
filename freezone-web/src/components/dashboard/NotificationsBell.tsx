/**
 * Topbar notification bell — consumes `GET /api/admin/notifications` per the
 * frozen contract (e). Until the WS1 backend merges the persistent-notification
 * list, the live endpoint returns only the legacy counters
 * (`pendingReview` / `newComments` / `categoriesNoAttrs`), so this component
 * degrades gracefully: counters become synthetic rows, list/markRead features
 * appear automatically once the contract fields ship, and errors render a
 * friendly empty/error state instead of breaking the topbar.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  CheckCheck,
  FolderTree,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  ShieldAlert,
  ShoppingCart,
  Truck,
} from "lucide-react";
import {
  notificationsApi,
  type NotificationItem,
  type NotificationsResponse,
} from "@/lib/dashboard/api";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import s from "./topbar.module.css";

const POLL_INTERVAL_MS = 60_000;

function typeIcon(type: string) {
  if (type.startsWith("order.")) return <Truck size={15} aria-hidden />;
  if (type.startsWith("stock.")) return <Package size={15} aria-hidden />;
  if (type === "review.pending") return <ShieldAlert size={15} aria-hidden />;
  if (type === "contact.message") return <Mail size={15} aria-hidden />;
  return <Bell size={15} aria-hidden />;
}

function relativeTime(iso: string, lang: "en" | "ar", justNow: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.round((then - Date.now()) / 1000);
  if (Math.abs(diffSec) < 45) return justNow;
  const rtf = new Intl.RelativeTimeFormat(lang === "ar" ? "ar" : "en", { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86_400), "day");
}

type BellState =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ready"; data: NotificationsResponse };

export function NotificationsBell() {
  const { t, lang } = useDashboardLocale();
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<BellState>({ phase: "loading" });
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await notificationsApi.list({ pageSize: 10 });
      setState({ phase: "ready", data });
    } catch {
      setState((prev) => (prev.phase === "ready" ? prev : { phase: "error" }));
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const data = state.phase === "ready" ? state.data : null;
  const items: NotificationItem[] = data?.items ?? [];
  const hasPersistentList = Array.isArray(data?.items);

  /** Legacy counters surfaced as synthetic rows until the contract list ships. */
  const counterRows = useMemo(() => {
    if (!data || hasPersistentList) return [];
    const rows: Array<{ key: string; label: string; to: string }> = [];
    if (data.pendingReview > 0) {
      rows.push({
        key: "pendingReview",
        label: t("notifications.pendingReview", { count: data.pendingReview }),
        to: "/admin/products?catalogStatus=PENDING_REVIEW",
      });
    }
    if (data.newComments > 0) {
      rows.push({
        key: "newComments",
        label: t("notifications.newComments", { count: data.newComments }),
        to: "/admin/products",
      });
    }
    if (data.categoriesNoAttrs > 0) {
      rows.push({
        key: "categoriesNoAttrs",
        label: t("notifications.categoriesNoAttrs", { count: data.categoriesNoAttrs }),
        to: "/admin/categories",
      });
    }
    return rows;
  }, [data, hasPersistentList, t]);

  const unreadCount =
    data?.unreadCount ??
    (data && !hasPersistentList
      ? (data.pendingReview > 0 ? 1 : 0) +
        (data.newComments > 0 ? 1 : 0) +
        (data.categoriesNoAttrs > 0 ? 1 : 0)
      : 0);

  const onItemClick = async (item: NotificationItem) => {
    setOpen(false);
    if (item.readAt === null) {
      try {
        await notificationsApi.markRead({ ids: [item.id] });
        void load();
      } catch {
        /* mark-read not available yet — navigation still works */
      }
    }
    if (item.href) navigate(item.href);
  };

  const onMarkAllRead = async () => {
    setMarking(true);
    try {
      await notificationsApi.markRead({ all: true });
      await load();
    } catch {
      /* endpoint not merged yet — keep the dropdown usable */
    } finally {
      setMarking(false);
    }
  };

  const isEmpty =
    state.phase === "ready" && items.length === 0 && counterRows.length === 0;

  return (
    <div className={s.bellWrap} ref={wrapRef}>
      <button
        type="button"
        className={s.bellBtn}
        aria-label={
          unreadCount > 0
            ? `${t("notifications.aria")} — ${t("notifications.unread", { count: unreadCount })}`
            : t("notifications.aria")
        }
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        <Bell size={17} aria-hidden />
        {unreadCount > 0 && (
          <span className={s.bellDot} aria-hidden>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={s.bellDropdown} role="region" aria-label={t("notifications.title")}>
          <div className={s.bellHeader}>
            <span className={s.bellTitle}>{t("notifications.title")}</span>
            {hasPersistentList && (data?.unreadCount ?? 0) > 0 && (
              <button
                type="button"
                className={s.markReadBtn}
                onClick={() => void onMarkAllRead()}
                disabled={marking}
              >
                {marking ? (
                  <Loader2 size={13} className={s.spinIcon} aria-hidden />
                ) : (
                  <CheckCheck size={13} aria-hidden />
                )}
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          <div className={s.bellList}>
            {state.phase === "loading" && (
              <div className={s.searchStatus}>
                <Loader2 size={15} className={s.spinIcon} aria-hidden /> {t("common.loading")}
              </div>
            )}

            {state.phase === "error" && (
              <div className={s.bellEmpty}>
                <BellOff size={22} aria-hidden />
                <div className={s.bellEmptyTitle}>{t("notifications.error")}</div>
                <div className={s.bellEmptyHint}>{t("notifications.errorHint")}</div>
                <button type="button" className={s.markReadBtn} onClick={() => void load()}>
                  {t("common.retry")}
                </button>
              </div>
            )}

            {isEmpty && (
              <div className={s.bellEmpty}>
                <Bell size={22} aria-hidden />
                <div className={s.bellEmptyTitle}>{t("notifications.empty")}</div>
                <div className={s.bellEmptyHint}>{t("notifications.emptyHint")}</div>
              </div>
            )}

            {/* Synthetic counter rows (legacy response shape) */}
            {counterRows.map((row) => (
              <button
                key={row.key}
                type="button"
                className={s.bellItem}
                onClick={() => {
                  setOpen(false);
                  navigate(row.to);
                }}
              >
                <span className={s.bellItemIcon}>
                  {row.key === "categoriesNoAttrs" ? (
                    <FolderTree size={15} aria-hidden />
                  ) : row.key === "newComments" ? (
                    <MessageSquare size={15} aria-hidden />
                  ) : (
                    <ShoppingCart size={15} aria-hidden />
                  )}
                </span>
                <span className={s.bellItemText}>
                  <span className={s.bellItemTitle}>{row.label}</span>
                </span>
              </button>
            ))}

            {/* Persistent notifications (contract e) */}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={[s.bellItem, item.readAt === null && s.bellItemUnread]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => void onItemClick(item)}
              >
                <span className={s.bellItemIcon}>{typeIcon(item.type)}</span>
                <span className={s.bellItemText}>
                  <span className={s.bellItemTitle}>
                    {lang === "ar" ? item.titleAr || item.titleEn : item.titleEn || item.titleAr}
                  </span>
                  {(item.bodyEn || item.bodyAr) && (
                    <span className={s.bellItemBody}>
                      {lang === "ar" ? item.bodyAr || item.bodyEn : item.bodyEn || item.bodyAr}
                    </span>
                  )}
                  <span className={s.bellItemTime}>
                    {relativeTime(item.createdAt, lang, t("common.justNow"))}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
