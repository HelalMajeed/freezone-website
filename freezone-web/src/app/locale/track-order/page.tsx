"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { PackageSearch } from "lucide-react";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { Seo } from "@/components/seo/Seo";
import {
  OrderTrackError,
  readRememberedOrders,
  rememberOrder,
  trackPublicOrder,
  type PublicTrackedOrder,
  type RememberedOrder,
} from "@/lib/order-tracking";
import type { OrderStatus } from "@/lib/siteStore";
import styles from "./trackOrder.module.css";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

function formatDate(iso: string, locale: "en" | "ar") {
  try {
    return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-IQ" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function TrackOrderPage() {
  const t = useTranslations("TrackOrder");
  const tSeo = useTranslations("Seo");
  const locale = useLocale();
  const [searchParams] = useSearchParams();

  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") ?? "");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"" | "notFound" | "rateLimited" | "errorGeneric">("");
  const [result, setResult] = useState<PublicTrackedOrder | null>(null);
  const [recent, setRecent] = useState<RememberedOrder[]>([]);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    setRecent(readRememberedOrders());
  }, []);

  const runTrack = async (num: string, ph: string) => {
    const n = num.trim();
    const p = ph.trim();
    if (!n || !p) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await trackPublicOrder(n, p);
      setResult(data);
      rememberOrder({
        orderNumber: data.orderNumber,
        phone: p,
        total: data.total,
        status: data.status,
        createdAt: data.createdAt,
      });
      setRecent(readRememberedOrders());
    } catch (e) {
      if (e instanceof OrderTrackError && e.code === "NOT_FOUND") {
        setError("notFound");
      } else if (e instanceof OrderTrackError && e.code === "RATE_LIMITED") {
        setError("rateLimited");
      } else {
        setError("errorGeneric");
      }
    } finally {
      setLoading(false);
    }
  };

  /** Deep link from account / checkout: ?order=FZ-…&phone=07… auto-tracks once. */
  useEffect(() => {
    const o = searchParams.get("order");
    const p = searchParams.get("phone");
    if (o && p && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void runTrack(o, p);
    }
  }, [searchParams]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runTrack(orderNumber, phone);
  };

  const statusLabel = (s: OrderStatus | string) => t(`status_${s}`, { defaultValue: s });

  const statusPillClass = (s: OrderStatus) =>
    s === "delivered"
      ? `${styles.statusPill} ${styles.statusPillDelivered}`
      : s === "cancelled"
        ? `${styles.statusPill} ${styles.statusPillCancelled}`
        : styles.statusPill;

  return (
    <div className={styles.wrapper}>
      <Seo title={tSeo("trackOrderTitle")} description={tSeo("trackOrderDesc")} />

      <header className={styles.head}>
        <span className={styles.headIcon}>
          <PackageSearch size={28} aria-hidden />
        </span>
        <h1 className="fz-type-h1">{t("title")}</h1>
        <p className={`fz-type-small ${styles.subtitle}`}>{t("subtitle")}</p>
      </header>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="fz-track-order-number">
              {t("orderNumberLabel")}
            </label>
            <input
              id="fz-track-order-number"
              className={styles.input}
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder={t("orderNumberPlaceholder")}
              autoComplete="off"
              required
              dir="ltr"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "fz-track-error" : undefined}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="fz-track-phone">
              {t("phoneLabel")}
            </label>
            <input
              id="fz-track-phone"
              className={styles.input}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phonePlaceholder")}
              required
              dir="ltr"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "fz-track-error" : undefined}
            />
          </div>
          {error ? (
            <p id="fz-track-error" className={styles.error} role="alert">
              {t(error === "notFound" ? "notFound" : error === "rateLimited" ? "rateLimited" : "errorGeneric")}
            </p>
          ) : null}
          <div className={styles.submitRow}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t("loading") : t("submit")}
            </button>
          </div>
        </form>

        {result ? (
          <div className={styles.result}>
            <div className={styles.resultHead}>
              <h2 className={`fz-type-h3 ${styles.sectionTitle}`}>
                {t("resultTitle", { orderNumber: result.orderNumber })}
              </h2>
              <span className={statusPillClass(result.status)}>{statusLabel(result.status)}</span>
            </div>

            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("placedOn")}</span>
                <span className={styles.metaValue}>{formatDate(result.createdAt, locale)}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("fulfillment")}</span>
                <span className={styles.metaValue}>
                  {result.fulfillment === "pickup" ? t("pickup") : t("delivery")}
                </span>
              </div>
              {result.city ? (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>{t("city")}</span>
                  <span className={styles.metaValue}>{result.city}</span>
                </div>
              ) : null}
            </div>

            {result.timeline.length > 0 ? (
              <section aria-label={t("timelineTitle")}>
                <h3 className={`fz-type-h4 ${styles.sectionTitle}`}>{t("timelineTitle")}</h3>
                <ol className={styles.timeline}>
                  {result.timeline.map((ev, i) => (
                    <li key={`${ev.status}-${i}`} className={styles.timelineItem}>
                      <span className={styles.timelineDot} aria-hidden />
                      <div className={styles.timelineStatus}>{statusLabel(ev.status)}</div>
                      <div className={styles.timelineAt}>{formatDate(ev.at, locale)}</div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {result.items.length > 0 ? (
              <section aria-label={t("itemsTitle")}>
                <h3 className={`fz-type-h4 ${styles.sectionTitle}`}>{t("itemsTitle")}</h3>
                <ul className={styles.itemsList}>
                  {result.items.map((item, i) => (
                    <li key={`${item.name}-${i}`} className={styles.itemRow}>
                      {item.image ? (
                        <img src={item.image} alt="" className={styles.itemImage} loading="lazy" width={44} height={44} />
                      ) : null}
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemQty}>×{item.qty}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>{t("subtotal")}</span>
                <span>{formatMoney(result.subtotal)} IQD</span>
              </div>
              {result.discountTotal > 0 ? (
                <div className={styles.totalRow}>
                  <span>{t("discount")}</span>
                  <span>−{formatMoney(result.discountTotal)} IQD</span>
                </div>
              ) : null}
              <div className={styles.totalRow}>
                <span>{t("shipping")}</span>
                <span className={result.shipping === 0 ? styles.freeShipping : undefined}>
                  {result.shipping === 0 ? t("free") : `${formatMoney(result.shipping)} IQD`}
                </span>
              </div>
              <div className={`${styles.totalRow} ${styles.totalRowGrand}`}>
                <span>{t("total")}</span>
                <span>{formatMoney(result.total)} IQD</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {recent.length > 0 ? (
        <section className={styles.recent} aria-label={t("recentTitle")}>
          <h2 className={`fz-type-h3 ${styles.sectionTitle}`}>{t("recentTitle")}</h2>
          <ul className={styles.recentList}>
            {recent.map((o) => (
              <li key={o.orderNumber} className={styles.recentRow}>
                <div className={styles.recentMeta}>
                  <span className={styles.recentNumber}>{o.orderNumber}</span>
                  <span className={styles.recentDate}>
                    {formatDate(o.createdAt, locale)}
                    {o.status ? ` · ${statusLabel(o.status)}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.recentBtn}
                  onClick={() => {
                    setOrderNumber(o.orderNumber);
                    setPhone(o.phone);
                    void runTrack(o.orderNumber, o.phone);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {t("trackAgain")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
