/**
 * Customer-review moderation (API_CONTRACT §4) — pending queue first, star
 * display, product link, approve / hide / delete (delete confirmed). Approving
 * or removing a review recomputes the product rating server-side in the same
 * transaction. Distinct from /admin/products/review (internal catalog queue).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import {
  reviewsModerationApi,
  type ModerationReview,
  type ModerationReviewsQuery,
} from "@/lib/dashboard/api-extra";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import { formatDateTime, formatInt } from "@/lib/dashboard/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Table,
  Tabs,
  useConfirm,
  useToast,
} from "@/components/dashboard/ui";

type StatusTab = NonNullable<ModerationReviewsQuery["status"]>;

const PAGE_SIZE = 20;

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      style={{ display: "inline-flex", gap: 2, color: "var(--fz-warning)" }}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          aria-hidden
          fill={i <= rating ? "currentColor" : "none"}
          opacity={i <= rating ? 1 : 0.35}
        />
      ))}
    </span>
  );
}

export function DashboardReviewsModerationPage() {
  const { lang, t, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();

  const [status, setStatus] = useState<StatusTab>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [reviews, setReviews] = useState<ModerationReview[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
    reviewsModerationApi
      .list({ status, search: search || undefined, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (!alive) return;
        setReviews(res.reviews);
        setTotal(res.total);
        setPendingCount(res.pendingCount);
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
  }, [status, search, page, reloadKey, formatError]);

  const onSetApproved = async (review: ModerationReview, isApproved: boolean) => {
    setBusyId(review.id);
    try {
      await reviewsModerationApi.setApproved(review.id, isApproved);
      toast.success(isApproved ? t("reviewsMod.approvedToast") : t("reviewsMod.unapprovedToast"));
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (review: ModerationReview) => {
    const sure = await confirm({
      title: t("reviewsMod.deleteTitle"),
      message: t("reviewsMod.deleteMessage", { name: review.customerName }),
      confirmLabel: t("confirm.delete"),
      tone: "danger",
    });
    if (!sure) return;
    setBusyId(review.id);
    try {
      await reviewsModerationApi.remove(review.id);
      toast.success(t("reviewsMod.deletedToast"));
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusyId(null);
    }
  };

  const productName = (r: ModerationReview) =>
    r.product
      ? lang === "ar"
        ? r.product.nameAr || r.product.nameEn
        : r.product.nameEn || r.product.nameAr
      : null;

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{t("reviewsMod.title")}</h1>
          <div className="dashboard-page-subtitle">{t("reviewsMod.subtitle")}</div>
        </div>
      </div>

      <Card tight>
        <div style={{ padding: "10px 14px 0" }}>
          <Tabs
            ariaLabel={t("reviewsMod.colStatus")}
            value={status}
            onChange={(key) => {
              setStatus(key as StatusTab);
              setPage(1);
            }}
            items={[
              { key: "pending", label: t("reviewsMod.tabPending"), count: pendingCount },
              { key: "approved", label: t("reviewsMod.tabApproved") },
              { key: "all", label: t("reviewsMod.tabAll") },
            ]}
          />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "12px 14px" }}>
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("reviewsMod.searchPlaceholder")}
            aria-label={t("common.search")}
            style={{ flex: "1 1 280px" }}
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
            rowKey={(r) => r.id}
            rows={reviews}
            empty={
              <EmptyState
                icon={<Star size={26} />}
                title={status === "pending" ? t("reviewsMod.emptyPending") : t("reviewsMod.empty")}
              />
            }
            pagination={{
              page,
              pageSize: PAGE_SIZE,
              total,
              onPageChange: setPage,
            }}
            columns={[
              {
                header: t("reviewsMod.colReview"),
                cell: (r) => (
                  <div style={{ maxWidth: 420 }}>
                    <div style={{ fontWeight: 600 }}>
                      {r.customerName}
                      {r.phone && (
                        <span
                          style={{
                            fontWeight: 400,
                            fontSize: 12,
                            color: "var(--fz-text-muted)",
                            marginInlineStart: 8,
                          }}
                          dir="ltr"
                        >
                          {r.phone}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--fz-text-soft)",
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {r.comment}
                    </div>
                  </div>
                ),
              },
              {
                header: t("reviewsMod.colRating"),
                cell: (r) => (
                  <Stars
                    rating={r.rating}
                    label={t("reviewsMod.ratingOf", { rating: formatInt(r.rating, lang) })}
                  />
                ),
              },
              {
                header: t("reviewsMod.colProduct"),
                cell: (r) =>
                  r.product ? (
                    <Link to={`/admin/products/${r.product.id}`}>{productName(r)}</Link>
                  ) : (
                    <Badge tone="neutral">{t("reviewsMod.deletedProduct")}</Badge>
                  ),
              },
              {
                header: t("reviewsMod.colStatus"),
                cell: (r) =>
                  r.isApproved ? (
                    <Badge tone="success">{t("reviewsMod.statusApproved")}</Badge>
                  ) : (
                    <Badge tone="warning">{t("reviewsMod.statusPending")}</Badge>
                  ),
              },
              {
                header: t("reviewsMod.colDate"),
                cell: (r) => formatDateTime(r.createdAt, lang),
              },
              {
                header: "",
                cell: (r) => (
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {r.isApproved ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busyId === r.id}
                        onClick={() => void onSetApproved(r, false)}
                      >
                        {t("reviewsMod.unapprove")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        loading={busyId === r.id}
                        onClick={() => void onSetApproved(r, true)}
                      >
                        {t("reviewsMod.approve")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === r.id}
                      onClick={() => void onDelete(r)}
                      aria-label={t("common.delete")}
                      title={t("common.delete")}
                    >
                      ✕
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}

export default DashboardReviewsModerationPage;
