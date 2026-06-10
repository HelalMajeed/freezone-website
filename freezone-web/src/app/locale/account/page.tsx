"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GitCompare, Heart, LogIn, LogOut, PackageSearch, ShoppingCart, UserPlus } from "lucide-react";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { useStorefrontUser } from "@/lib/storefront-user";
import { freezoneApiUrl, getInternalApiFetchSignal } from "@/lib/api-internal";
import { readRememberedOrders, type RememberedOrder } from "@/lib/order-tracking";
import { Seo } from "@/components/seo/Seo";
import styles from "./account.module.css";

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

/** Sanitized order item from GET /api/public/auth/orders (order-tracking shape). */
type CustomerOrder = {
  orderNumber: string;
  status: string;
  fulfillment: string;
  city: string;
  createdAt: string;
  subtotal: number;
  shipping: number;
  discountTotal: number;
  total: number;
  items: { name: string; qty: number; image: string | null }[];
};

async function fetchCustomerOrders(): Promise<CustomerOrder[]> {
  const res = await fetch(freezoneApiUrl("/api/public/auth/orders"), {
    credentials: "include",
    signal: getInternalApiFetchSignal(),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = (await res.json().catch(() => null)) as { ok?: boolean; orders?: CustomerOrder[] } | null;
  if (!json?.ok || !Array.isArray(json.orders)) throw new Error("BAD_RESPONSE");
  return json.orders;
}

export default function AccountPage() {
  const locale = useLocale();
  const t = useTranslations("Account");
  const tTrack = useTranslations("TrackOrder");
  const tSeo = useTranslations("Seo");
  const status = useStorefrontUser((s) => s.status);
  const customer = useStorefrontUser((s) => s.customer);
  const hydrate = useStorefrontUser((s) => s.hydrate);
  const logout = useStorefrontUser((s) => s.logout);
  const [localOrders, setLocalOrders] = useState<RememberedOrder[]>([]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    setLocalOrders(readRememberedOrders());
  }, []);

  const isAuthed = status === "authenticated";
  const checking = status === "unknown" || status === "loading";

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", customer?.id],
    queryFn: fetchCustomerOrders,
    enabled: isAuthed,
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <div className={styles.wrapper}>
      <Seo title={tSeo("accountTitle")} noindex />

      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={`fz-type-h1 ${styles.title}`}>{t("title")}</h1>
          <p className={`fz-type-small ${styles.note}`}>
            {isAuthed ? t("signedInNote") : checking ? t("checkingSession") : t("guestNote")}
          </p>
        </div>
        {isAuthed ? (
          <button type="button" className={styles.signOutBtn} onClick={() => void logout()}>
            <LogOut size={16} aria-hidden />
            {t("signOut")}
          </button>
        ) : null}
      </header>

      {!isAuthed && !checking ? (
        <section className={styles.card} aria-label={t("guestCtaTitle")}>
          <h2 className={`fz-type-h3 ${styles.cardTitle}`}>{t("guestCtaTitle")}</h2>
          <p className={styles.empty}>{t("guestCtaNote")}</p>
          <div className={styles.authCtas}>
            <Link href="/login" className="btn-primary">
              <LogIn size={16} aria-hidden className={styles.ctaIcon} />
              {t("signIn")}
            </Link>
            <Link href="/register" className={styles.secondaryCta}>
              <UserPlus size={16} aria-hidden className={styles.ctaIcon} />
              {t("createAccount")}
            </Link>
          </div>
        </section>
      ) : null}

      {isAuthed && customer ? (
        <section className={styles.card} aria-label={t("profileTitle")}>
          <h2 className={`fz-type-h3 ${styles.cardTitle}`}>{t("profileTitle")}</h2>
          <dl className={styles.profileGrid}>
            <div className={styles.profileRow}>
              <dt className={styles.profileLabel}>{t("profileName")}</dt>
              <dd className={styles.profileValue}>{customer.name}</dd>
            </div>
            <div className={styles.profileRow}>
              <dt className={styles.profileLabel}>{t("profilePhone")}</dt>
              <dd className={styles.profileValue} dir="ltr">
                {customer.phone}
              </dd>
            </div>
            <div className={styles.profileRow}>
              <dt className={styles.profileLabel}>{t("profileEmail")}</dt>
              <dd className={styles.profileValue}>{customer.email || "—"}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section className={styles.card} aria-label={t("quickTitle")}>
        <h2 className={`fz-type-h3 ${styles.cardTitle}`}>{t("quickTitle")}</h2>
        <div className={styles.quickGrid}>
          <Link href="/wishlist" className={styles.quickLink}>
            <Heart size={20} aria-hidden />
            {t("linkWishlist")}
          </Link>
          <Link href="/compare" className={styles.quickLink}>
            <GitCompare size={20} aria-hidden />
            {t("linkCompare")}
          </Link>
          <Link href="/track-order" className={styles.quickLink}>
            <PackageSearch size={20} aria-hidden />
            {t("linkTrack")}
          </Link>
          <Link href="/cart" className={styles.quickLink}>
            <ShoppingCart size={20} aria-hidden />
            {t("linkCart")}
          </Link>
        </div>
      </section>

      <section className={styles.card} aria-label={t("ordersTitle")}>
        <h2 className={`fz-type-h3 ${styles.cardTitle}`}>{t("ordersTitle")}</h2>

        {isAuthed ? (
          ordersQuery.isPending ? (
            <p className={styles.empty}>{t("ordersLoading")}</p>
          ) : ordersQuery.isError ? (
            <>
              <p className={styles.empty} role="alert">
                {t("ordersError")}
              </p>
              <div className={styles.emptyActions}>
                <button type="button" className={styles.retryBtn} onClick={() => void ordersQuery.refetch()}>
                  {t("retry")}
                </button>
              </div>
            </>
          ) : ordersQuery.data.length === 0 ? (
            <>
              <p className={styles.empty}>{t("ordersEmpty")}</p>
              <div className={styles.emptyActions}>
                <Link href="/products" className="btn-primary">
                  {t("shopNow")}
                </Link>
              </div>
            </>
          ) : (
            <ul className={styles.ordersList}>
              {ordersQuery.data.map((o) => (
                <li key={o.orderNumber} className={styles.orderRow}>
                  <div className={styles.orderMeta}>
                    <span className={styles.orderNumber}>{t("orderLabel", { orderNumber: o.orderNumber })}</span>
                    <span className={styles.orderSub}>
                      {formatDate(o.createdAt, locale)}
                      {o.status ? ` · ${tTrack(`status_${o.status}`, { defaultValue: o.status })}` : ""}
                    </span>
                  </div>
                  {o.total > 0 ? <span className={styles.orderTotal}>{formatMoney(o.total)} IQD</span> : null}
                  <Link
                    href={`/track-order?order=${encodeURIComponent(o.orderNumber)}&phone=${encodeURIComponent(customer?.phone ?? "")}`}
                    className={styles.trackLink}
                  >
                    {t("trackBtn")}
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : localOrders.length === 0 ? (
          <>
            <p className={styles.empty}>{t("ordersEmpty")}</p>
            <div className={styles.emptyActions}>
              <Link href="/products" className="btn-primary">
                {t("shopNow")}
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className={`fz-type-small ${styles.note}`}>{t("deviceOrdersNote")}</p>
            <ul className={styles.ordersList}>
              {localOrders.map((o) => (
                <li key={o.orderNumber} className={styles.orderRow}>
                  <div className={styles.orderMeta}>
                    <span className={styles.orderNumber}>{t("orderLabel", { orderNumber: o.orderNumber })}</span>
                    <span className={styles.orderSub}>
                      {formatDate(o.createdAt, locale)}
                      {o.status ? ` · ${tTrack(`status_${o.status}`, { defaultValue: o.status })}` : ""}
                    </span>
                  </div>
                  {o.total > 0 ? <span className={styles.orderTotal}>{formatMoney(o.total)} IQD</span> : null}
                  <Link
                    href={`/track-order?order=${encodeURIComponent(o.orderNumber)}&phone=${encodeURIComponent(o.phone)}`}
                    className={styles.trackLink}
                  >
                    {t("trackBtn")}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
