/**
 * Audit log — frozen contract (g): filtered + paginated list
 * (user / action / entity / entityId / date-range), a details drawer with a
 * collapsible before/after JSON diff, deep links to the affected record pages,
 * and a per-entity history drawer.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileClock, History, ScrollText } from "lucide-react";
import { auditApi, type AuditLogEntry, type AuditLogResponse, type Paginated } from "@/lib/dashboard/api";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import { formatDateTime } from "@/lib/dashboard/format";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Input,
  Select,
  Table,
} from "@/components/dashboard/ui";
import s from "./Audit.module.css";

const KNOWN_ENTITIES = [
  "Product",
  "Order",
  "Category",
  "Brand",
  "Coupon",
  "MediaAsset",
  "AdminUser",
  "SiteConfig",
  "CmsPageSection",
  "HeroSlide",
  "PromoBanner",
];

/** Deep link to the dashboard page that manages a given entity. */
function recordLink(entity: string, entityId: string | null): string | null {
  switch (entity) {
    case "Order":
      return entityId ? `/dashboard/orders/${entityId}` : "/dashboard/orders";
    case "Product":
      return entityId
        ? `/dashboard/products?search=${encodeURIComponent(entityId)}`
        : "/dashboard/products";
    case "Category":
      return "/dashboard/categories";
    case "Brand":
      return "/dashboard/brands";
    case "Coupon":
      return "/dashboard/coupons";
    case "MediaAsset":
      return "/dashboard/media";
    case "AdminUser":
      return entityId
        ? `/dashboard/users?search=${encodeURIComponent(entityId)}`
        : "/dashboard/users";
    case "SiteConfig":
      return "/dashboard/settings";
    case "CmsPageSection":
    case "HeroSlide":
    case "PromoBanner":
      return "/dashboard/cms";
    default:
      return null;
  }
}

// ── Before/after diff ────────────────────────────────────────────────────────

type DiffLine = {
  key: string;
  kind: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function stableStringify(v: unknown): string {
  if (v === undefined) return "undefined";
  try {
    return JSON.stringify(v, null, 1) ?? "null";
  } catch {
    return String(v);
  }
}

function diffObjects(before: Record<string, unknown>, after: Record<string, unknown>): DiffLine[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const lines: DiffLine[] = [];
  for (const key of keys) {
    const b = before[key];
    const a = after[key];
    if (stableStringify(b) === stableStringify(a)) continue;
    if (!(key in before)) lines.push({ key, kind: "added", after: a });
    else if (!(key in after)) lines.push({ key, kind: "removed", before: b });
    else lines.push({ key, kind: "changed", before: b, after: a });
  }
  return lines;
}

/** Extract a `{ before, after }` pair from common payload shapes. */
function extractBeforeAfter(
  payload: unknown,
): { before: Record<string, unknown>; after: Record<string, unknown> } | null {
  if (!isPlainObject(payload)) return null;
  if (isPlainObject(payload.before) && isPlainObject(payload.after)) {
    return { before: payload.before, after: payload.after };
  }
  // `{ from, to }` style (e.g. order.update status transitions)
  if ("from" in payload && "to" in payload) {
    return {
      before: { value: payload.from },
      after: { value: payload.to },
    };
  }
  // `{ xxxBefore, xxxAfter }` pairs (e.g. shippingBefore / shippingAfter)
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  let found = false;
  for (const [key, value] of Object.entries(payload)) {
    if (key.endsWith("Before")) {
      before[key.slice(0, -6)] = value;
      found = true;
    } else if (key.endsWith("After")) {
      after[key.slice(0, -5)] = value;
      found = true;
    }
  }
  return found ? { before, after } : null;
}

function PayloadView({ payload }: { payload: unknown }) {
  const { t } = useDashboardLocale();
  if (payload === null || payload === undefined) {
    return <div className={s.drawerFootNote}>{t("audit.noPayload")}</div>;
  }
  const pair = extractBeforeAfter(payload);
  const diff = pair ? diffObjects(pair.before, pair.after) : [];
  return (
    <div className={s.diffSection}>
      {pair && diff.length > 0 && (
        <>
          <div className={s.diffTitle}>{t("audit.diff")}</div>
          {diff.map((line) => (
            <div key={line.key} className={s.diffRow}>
              <div className={s.diffKey}>
                <span>{line.key}</span>
                <Badge
                  tone={
                    line.kind === "added" ? "success" : line.kind === "removed" ? "danger" : "info"
                  }
                >
                  {line.kind === "added"
                    ? t("audit.diffAdded")
                    : line.kind === "removed"
                      ? t("audit.diffRemoved")
                      : t("audit.diffChanged")}
                </Badge>
              </div>
              {line.kind !== "added" && (
                <div className={`${s.diffValue} ${s.diffBefore}`}>
                  {stableStringify(line.before)}
                </div>
              )}
              {line.kind !== "removed" && (
                <div className={`${s.diffValue} ${s.diffAfter}`}>{stableStringify(line.after)}</div>
              )}
            </div>
          ))}
        </>
      )}
      <details className={s.jsonDetails}>
        <summary>{t("audit.payload")}</summary>
        <pre className={s.jsonPre}>{stableStringify(payload)}</pre>
      </details>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Filters = {
  user: string;
  action: string;
  entity: string;
  entityId: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = { user: "", action: "", entity: "", entityId: "", from: "", to: "" };

export function DashboardAuditPage() {
  const { lang, t, formatError } = useDashboardLocale();

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [detail, setDetail] = useState<AuditLogEntry | null>(null);

  const [historyFor, setHistoryFor] = useState<{ entity: string; entityId: string } | null>(null);
  const [history, setHistory] = useState<Paginated<AuditLogEntry> | null>(null);
  const [historyErr, setHistoryErr] = useState<string | null>(null);

  // Debounce text filters into the applied set.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next: Filters = {
        ...draft,
        user: draft.user.trim(),
        action: draft.action.trim(),
        entityId: draft.entityId.trim(),
      };
      if (JSON.stringify(filters) === JSON.stringify(next)) return;
      setPage(1);
      setFilters(next);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft, filters]);

  const load = useCallback(async () => {
    try {
      const res = await auditApi.list({
        page,
        pageSize,
        user: filters.user || undefined,
        action: filters.action || undefined,
        entity: filters.entity || undefined,
        entityId: filters.entityId || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setData(res);
      setErr(null);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, formatError]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Per-entity history drawer.
  useEffect(() => {
    if (!historyFor) return;
    let alive = true;
    setHistory(null);
    setHistoryErr(null);
    auditApi
      .entityHistory(historyFor.entity, historyFor.entityId, { pageSize: 100 })
      .then((res) => {
        if (alive) setHistory(res);
      })
      .catch((e: unknown) => {
        if (alive) setHistoryErr(formatError(e));
      });
    return () => {
      alive = false;
    };
  }, [historyFor, formatError]);

  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const rows = data?.items ?? [];

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{t("audit.title")}</h1>
          <div className="dashboard-page-subtitle">{t("audit.subtitle")}</div>
        </div>
      </div>

      <Card tight>
        <div className={s.filterBar}>
          <Input
            value={draft.user}
            onChange={(e) => setDraft((d) => ({ ...d, user: e.target.value }))}
            placeholder={t("audit.filterUser")}
            aria-label={t("audit.filterUser")}
          />
          <Input
            value={draft.action}
            onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
            placeholder={t("audit.filterAction")}
            aria-label={t("audit.filterAction")}
            dir="ltr"
          />
          <Select
            value={draft.entity}
            onChange={(e) => setDraft((d) => ({ ...d, entity: (e.target as HTMLSelectElement).value }))}
            options={[
              { value: "", label: t("audit.allEntities") },
              ...KNOWN_ENTITIES.map((en) => ({ value: en, label: en })),
            ]}
            aria-label={t("audit.filterEntity")}
          />
          <Input
            value={draft.entityId}
            onChange={(e) => setDraft((d) => ({ ...d, entityId: e.target.value }))}
            placeholder={t("audit.filterEntityId")}
            aria-label={t("audit.filterEntityId")}
            dir="ltr"
          />
        </div>

        <div className={s.dateRow}>
          <label className={s.dateField}>
            <span>{t("common.from")}</span>
            <input
              type="date"
              className={s.dateInput}
              value={draft.from}
              max={draft.to || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            />
          </label>
          <label className={s.dateField}>
            <span>{t("common.to")}</span>
            <input
              type="date"
              className={s.dateInput}
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
          </label>
          {hasFilters && (
            <span className={s.clearBtn}>
              <Button size="sm" variant="ghost" onClick={() => setDraft(EMPTY_FILTERS)}>
                {t("common.clear")}
              </Button>
            </span>
          )}
        </div>

        {loading && !data ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div className={s.errorBox} role="alert">
            {err}
          </div>
        ) : (
          <Table<AuditLogEntry>
            rowKey={(e) => e.id}
            rows={rows}
            empty={<EmptyState icon={<ScrollText size={26} />} title={t("audit.empty")} />}
            pagination={{
              page,
              pageSize,
              total: data?.total ?? 0,
              onPageChange: setPage,
              onPageSizeChange: (next) => {
                setPage(1);
                setPageSize(next);
              },
              pageSizeOptions: [25, 50, 100, 200],
            }}
            columns={[
              {
                header: t("audit.colWhen"),
                width: "150px",
                cell: (e) => <span className={s.whenCell}>{formatDateTime(e.createdAt, lang)}</span>,
              },
              {
                header: t("audit.colAction"),
                cell: (e) => (
                  <Badge tone={e.action.includes("delete") || e.action.includes("cancel") ? "danger" : "brand"}>
                    <span dir="ltr">{e.action}</span>
                  </Badge>
                ),
              },
              {
                header: t("audit.colEntity"),
                cell: (e) => {
                  const link = recordLink(e.entity, e.entityId);
                  return (
                    <span className={s.entityCell}>
                      <span>{e.entity}</span>
                      {e.entityId && <span className={s.entityId}>#{e.entityId}</span>}
                      {link && (
                        <Link to={link} title={t("audit.openRecord")} aria-label={t("audit.openRecord")}>
                          <ExternalLink size={13} aria-hidden />
                        </Link>
                      )}
                    </span>
                  );
                },
              },
              {
                header: t("audit.colUser"),
                cell: (e) => <span className={s.userCell}>{e.userEmail ?? t("common.none")}</span>,
              },
              {
                header: "",
                align: "end",
                cell: (e) => (
                  <span className={s.rowActions}>
                    <Button
                      size="sm"
                      variant="ghost"
                      iconOnly
                      aria-label={t("audit.details")}
                      title={t("audit.details")}
                      onClick={() => setDetail(e)}
                    >
                      <FileClock size={14} aria-hidden />
                    </Button>
                    {e.entityId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        iconOnly
                        aria-label={t("audit.entityHistory")}
                        title={t("audit.entityHistory")}
                        onClick={() => setHistoryFor({ entity: e.entity, entityId: e.entityId! })}
                      >
                        <History size={14} aria-hidden />
                      </Button>
                    )}
                  </span>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* ── Entry details drawer ── */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={t("audit.details")}
        width="480px"
      >
        {detail && (
          <>
            <div className={s.detailMeta}>
              <div>
                <div className={s.detailLabel}>{t("audit.colAction")}</div>
                <div className={`${s.detailValue} ${s.mono}`}>{detail.action}</div>
              </div>
              <div>
                <div className={s.detailLabel}>{t("audit.colEntity")}</div>
                <div className={s.detailValue}>
                  {detail.entity}
                  {detail.entityId ? ` #${detail.entityId}` : ""}{" "}
                  {(() => {
                    const link = recordLink(detail.entity, detail.entityId);
                    return link ? (
                      <Link to={link} onClick={() => setDetail(null)}>
                        {t("audit.openRecord")}
                      </Link>
                    ) : null;
                  })()}
                </div>
              </div>
              <div>
                <div className={s.detailLabel}>{t("audit.colUser")}</div>
                <div className={`${s.detailValue} ${s.mono}`}>
                  {detail.userEmail ?? t("common.none")}
                  {detail.ip ? ` · ${detail.ip}` : ""}
                </div>
              </div>
              <div>
                <div className={s.detailLabel}>{t("audit.colWhen")}</div>
                <div className={s.detailValue}>{formatDateTime(detail.createdAt, lang)}</div>
              </div>
            </div>
            <PayloadView payload={detail.payload} />
          </>
        )}
      </Drawer>

      {/* ── Per-entity history drawer ── */}
      <Drawer
        open={historyFor !== null}
        onClose={() => setHistoryFor(null)}
        title={
          historyFor
            ? t("audit.historyTitle", { entity: historyFor.entity, id: historyFor.entityId })
            : ""
        }
        width="480px"
      >
        {historyErr ? (
          <div className={s.errorBox} role="alert">
            {historyErr}
          </div>
        ) : history === null ? (
          <div className={s.drawerFootNote}>{t("common.loading")}</div>
        ) : history.items.length === 0 ? (
          <div className={s.drawerFootNote}>{t("audit.historyEmpty")}</div>
        ) : (
          history.items.map((e) => (
            <div key={e.id} className={s.historyItem}>
              <span className={s.historyDot} aria-hidden />
              <div className={s.historyAction}>
                <span dir="ltr">{e.action}</span>
              </div>
              <div className={s.historyMeta}>
                {formatDateTime(e.createdAt, lang)}
                {e.userEmail ? ` · ${e.userEmail}` : ""}
              </div>
              <PayloadView payload={e.payload} />
            </div>
          ))
        )}
      </Drawer>
    </>
  );
}

export default DashboardAuditPage;
