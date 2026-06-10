"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { freezoneApiUrl } from "@/lib/api-internal";
import { isValidIraqiPhone } from "@/lib/phone";
import { useLocale, useTranslations } from "@/i18n/hooks";
import styles from "./productReviews.module.css";

type ReviewDto = {
  id: number;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type ReviewsResponse = {
  ok: boolean;
  reviews: ReviewDto[];
  total: number;
  ratingAvg: number;
  ratingCount: number;
};

const PAGE_SIZE = 10;

async function fetchReviews(productId: number, page: number): Promise<ReviewsResponse> {
  const res = await fetch(
    freezoneApiUrl(`/api/public/products/${productId}/reviews?page=${page}&pageSize=${PAGE_SIZE}`),
  );
  if (!res.ok) throw new Error(`reviews ${res.status}`);
  return res.json() as Promise<ReviewsResponse>;
}

/** "3 days ago" / "قبل ٣ أيام" — Intl handles both locales. */
function formatRelativeDate(iso: string, locale: "en" | "ar"): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 3600) return rtf.format(Math.trunc(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.trunc(diffSec / 3600), "hour");
  if (abs < 86_400 * 30) return rtf.format(Math.trunc(diffSec / 86_400), "day");
  if (abs < 86_400 * 365) return rtf.format(Math.trunc(diffSec / (86_400 * 30)), "month");
  return rtf.format(Math.trunc(diffSec / (86_400 * 365)), "year");
}

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <span className={styles.stars} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= rounded ? styles.starFilled : styles.starEmpty}
        />
      ))}
    </span>
  );
}

type SubmitState = { kind: "idle" } | { kind: "submitting" } | { kind: "success" } | { kind: "error"; messageKey: string };

export function ProductReviews({ productId }: { productId: number }) {
  const t = useTranslations("reviews");
  const tListing = useTranslations("listing");
  const locale = useLocale();

  const [page, setPage] = useState(1);
  const reviewsQuery = useQuery({
    queryKey: ["product-reviews", productId, page],
    queryFn: () => fetchReviews(productId, page),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [fieldError, setFieldError] = useState<string | null>(null);

  const data = reviewsQuery.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedComment = comment.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setFieldError(t("fieldNameError"));
      return;
    }
    if (!isValidIraqiPhone(phone)) {
      setFieldError(t("errorInvalidPhone"));
      return;
    }
    if (rating < 1 || rating > 5) {
      setFieldError(t("fieldRatingError"));
      return;
    }
    if (trimmedComment.length < 10) {
      setFieldError(t("fieldCommentError"));
      return;
    }
    setFieldError(null);
    setSubmitState({ kind: "submitting" });
    try {
      const res = await fetch(freezoneApiUrl(`/api/public/products/${productId}/reviews`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerName: trimmedName,
          phone: phone.trim(),
          rating,
          comment: trimmedComment,
        }),
      });
      if (res.status === 201) {
        setSubmitState({ kind: "success" });
        setName("");
        setPhone("");
        setRating(0);
        setComment("");
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setSubmitState({ kind: "error", messageKey: errorKeyFor(res.status, body?.error) });
    } catch {
      setSubmitState({ kind: "error", messageKey: "errorGeneric" });
    }
  };

  return (
    <section className={styles.reviewsSection} aria-labelledby="pdp-reviews-title">
      <h2 id="pdp-reviews-title" className={`fz-type-h2 ${styles.sectionTitle}`}>
        {t("title")}
      </h2>

      {data && data.ratingCount > 0 ? (
        <div className={styles.summaryRow} aria-label={t("summaryAria", { avg: String(data.ratingAvg) })}>
          <span className={styles.summaryAvg}>{data.ratingAvg}</span>
          <Stars value={data.ratingAvg} size={18} />
          <span className={styles.summaryCount}>{t("reviewsCount", { count: data.ratingCount })}</span>
        </div>
      ) : null}

      {reviewsQuery.isLoading ? (
        <p className={styles.stateLine}>{t("loading")}</p>
      ) : reviewsQuery.isError ? (
        <p className={styles.stateLine} role="alert">
          {t("loadError")}
        </p>
      ) : data && data.reviews.length === 0 ? (
        <p className={styles.stateLine}>{t("empty")}</p>
      ) : data ? (
        <>
          <ul className={styles.reviewList}>
            {data.reviews.map((r) => (
              <li key={r.id} className={styles.reviewItem}>
                <div className={styles.reviewHead}>
                  <span className={styles.reviewName}>{r.customerName}</span>
                  <Stars value={r.rating} />
                  <time className={styles.reviewDate} dateTime={r.createdAt}>
                    {formatRelativeDate(r.createdAt, locale)}
                  </time>
                </div>
                <p className={styles.reviewComment}>{r.comment}</p>
              </li>
            ))}
          </ul>
          {pageCount > 1 ? (
            <div className={styles.reviewPager}>
              <button
                type="button"
                className={styles.pagerBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                {tListing("prevPage")}
              </button>
              <span className={styles.pagerStatus}>
                {tListing("pageStatus", { page: String(page), total: String(pageCount) })}
              </span>
              <button
                type="button"
                className={styles.pagerBtn}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
              >
                {tListing("nextPage")}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <form className={styles.reviewForm} onSubmit={handleSubmit} noValidate>
        <h3 className={styles.formTitle}>{t("writeTitle")}</h3>

        {submitState.kind === "success" ? (
          <p className={styles.successNotice} role="status">
            {t("successPending")}
          </p>
        ) : null}
        {submitState.kind === "error" ? (
          <p className={styles.errorNotice} role="alert">
            {t(submitState.messageKey)}
          </p>
        ) : null}
        {fieldError ? (
          <p className={styles.errorNotice} role="alert">
            {fieldError}
          </p>
        ) : null}

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("nameLabel")}</span>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoComplete="name"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("phoneLabel")}</span>
            <input
              type="tel"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phonePlaceholder")}
              dir="ltr"
              autoComplete="tel"
              required
            />
            <span className={styles.fieldHint}>{t("phoneHint")}</span>
          </label>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel} id={`pdp-rating-label-${productId}`}>
            {t("ratingLabel")}
          </span>
          <div className={styles.ratingInput} role="radiogroup" aria-labelledby={`pdp-rating-label-${productId}`}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={rating === v}
                aria-label={t("starAria", { count: v })}
                className={v <= rating ? `${styles.starBtn} ${styles.starBtnActive}` : styles.starBtn}
                onClick={() => setRating(v)}
              >
                <Star size={24} aria-hidden />
              </button>
            ))}
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("commentLabel")}</span>
          <textarea
            className={styles.textarea}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("commentPlaceholder")}
            rows={4}
            minLength={10}
            maxLength={2000}
            required
          />
        </label>

        <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={submitState.kind === "submitting"}>
          {submitState.kind === "submitting" ? t("submitting") : t("submit")}
        </button>
      </form>
    </section>
  );
}

function errorKeyFor(status: number, code: string | undefined): string {
  if (status === 409 || code === "ALREADY_REVIEWED") return "errorAlreadyReviewed";
  if (code === "INVALID_PHONE") return "errorInvalidPhone";
  if (status === 429) return "errorRateLimited";
  if (status === 400) return "errorValidation";
  return "errorGeneric";
}
