"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./checkout.module.css";
import { useCart, computeCheckoutTotals } from "@/lib/store";
import { usePublicSite } from "@/components/providers/StorefrontProvider";
import { useSite, PaymentMethod } from "@/lib/siteStore";
import { Check, Truck, CreditCard, ClipboardList, Banknote, Smartphone, WalletCards, Building2, AlertTriangle } from "lucide-react";
import { Link } from "@/navigation";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { freezoneApiUrl } from "@/lib/api-internal";
import toast from "react-hot-toast";
import clsx from "clsx";
import { Seo } from "@/components/seo/Seo";
import { rememberOrder } from "@/lib/order-tracking";
import { IRAQ_PROVINCES, provinceLabel, type ProvinceCode } from "@/lib/iraq-provinces";
import { normalizeIraqiPhone, isValidIraqiPhone } from "@/lib/phone";
import { trackBeginCheckout, trackPurchase, type AnalyticsItem } from "@/lib/analytics";

type Fulfillment = "delivery" | "pickup";

/** WhatsApp Business click-to-chat (short link). Order text is appended as `?text=`. */
const WHATSAPP_ORDER_CHAT_URL = "https://wa.me/message/FWGAFHQGURU6H1" as const;

const ALL_METHODS: readonly PaymentMethod[] = ["cod", "store_pickup", "zaincash", "qicard", "fib", "visa", "master"];

function isKnownMethod(key: string): key is PaymentMethod {
  return (ALL_METHODS as readonly string[]).includes(key);
}

type MethodFlags = { enabled: boolean; comingSoon: boolean };

/**
 * Honest defaults until GET /api/public/payment-methods answers (and if it is
 * unreachable): cash methods always work, gateway methods stay "coming soon" —
 * never the other way around.
 */
const DEFAULT_METHOD_FLAGS: Record<PaymentMethod, MethodFlags> = {
  cod: { enabled: true, comingSoon: false },
  store_pickup: { enabled: true, comingSoon: false },
  zaincash: { enabled: false, comingSoon: true },
  qicard: { enabled: false, comingSoon: true },
  fib: { enabled: false, comingSoon: true },
  visa: { enabled: false, comingSoon: true },
  master: { enabled: false, comingSoon: true },
};

const DEFAULT_ELECTRONIC_ORDER: PaymentMethod[] = ["zaincash", "qicard", "fib", "visa", "master"];

/** Payment-method list as served by GET /api/public/payment-methods. */
type ApiPaymentMethod = { key: string; enabled: boolean; comingSoon: boolean; labelEn: string; labelAr: string };

function methodIcon(m: PaymentMethod) {
  switch (m) {
    case "cod":
      return Banknote;
    case "store_pickup":
      return Building2;
    case "zaincash":
      return Smartphone;
    case "qicard":
    case "fib":
      return WalletCards;
    case "visa":
    case "master":
      return CreditCard;
    default:
      return CreditCard;
  }
}

function paymentWhatsAppLabel(m: PaymentMethod): string {
  switch (m) {
    case "cod":
      return "Cash on delivery (pay driver at your address)";
    case "store_pickup":
      return "Cash at store — pickup at company location";
    case "zaincash":
      return "ZainCash";
    case "qicard":
      return "Qi Card";
    case "fib":
      return "FIB (First Iraqi Bank)";
    case "visa":
      return "Visa";
    case "master":
      return "Mastercard";
    default:
      return m;
  }
}

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const { items, clearCart, couponCode, couponDiscount } = useCart();
  const site = usePublicSite();
  const { addOrder } = useSite();
  const [step, setStep] = useState(1);
  const locale = useLocale();

  const threshold = site.freeDeliveryThreshold ?? 100000;
  const shipFee = site.standardShippingFee ?? 5000;
  const zainDisplay = (site.zainCashWallet || site.phone || "").trim();
  const qiDisplay = (site.qiCardMerchantId || "").trim();
  const storeLine = [site.storeName, site.address].filter(Boolean).join(" — ") || site.address;

  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "baghdad",
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [orderNotes, setOrderNotes] = useState("");
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  /** Local draft is written at most once per checkout attempt series. */
  const draftSavedRef = useRef(false);

  /** Method availability comes from the server (gateway env config), never guessed. */
  const [methodFlags, setMethodFlags] = useState<Record<PaymentMethod, MethodFlags>>(DEFAULT_METHOD_FLAGS);
  const [electronicOrder, setElectronicOrder] = useState<PaymentMethod[]>(DEFAULT_ELECTRONIC_ORDER);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(freezoneApiUrl("/api/public/payment-methods"));
        const data = (await res.json()) as { ok?: boolean; methods?: ApiPaymentMethod[] };
        if (cancelled || !res.ok || !data.ok || !Array.isArray(data.methods)) return;
        const flags = { ...DEFAULT_METHOD_FLAGS };
        const electronic: PaymentMethod[] = [];
        for (const m of data.methods) {
          if (!isKnownMethod(m.key)) continue;
          flags[m.key] = { enabled: Boolean(m.enabled), comingSoon: Boolean(m.comingSoon) };
          if (m.key !== "cod" && m.key !== "store_pickup") electronic.push(m.key);
        }
        setMethodFlags(flags);
        if (electronic.length > 0) setElectronicOrder(electronic);
      } catch {
        /* keep honest defaults: cash enabled, gateways coming soon */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** begin_checkout once per visit (no-op unless analytics ids are configured). */
  const beganCheckoutRef = useRef(false);
  useEffect(() => {
    if (beganCheckoutRef.current || items.length === 0) return;
    beganCheckoutRef.current = true;
    trackBeginCheckout(
      items.map((i): AnalyticsItem => ({
        id: i.id, name: i.name, price: i.price, quantity: i.qty, brand: i.brand, category: i.cat,
      })),
    );
  }, [items]);

  const isPickup = fulfillment === "pickup";

  /** Per-governorate delivery fee from the site payload (live on province change). */
  const provinceFee = site.shippingFees?.[form.city as ProvinceCode] ?? shipFee;

  const { subtotal: lineSubtotal, shipping, grandTotal } = computeCheckoutTotals(items, {
    pickup: isPickup,
    threshold,
    shipFee: provinceFee,
    couponDiscount,
  });

  const allowedMethods: PaymentMethod[] = isPickup
    ? ["store_pickup", ...electronicOrder]
    : ["cod", ...electronicOrder];

  /** If the selected method turns out to be unavailable (flags loaded), fall back to cash. */
  useEffect(() => {
    if (!methodFlags[paymentMethod]?.enabled) {
      setPaymentMethod(isPickup ? "store_pickup" : "cod");
    }
  }, [methodFlags, paymentMethod, isPickup]);

  const resolveAddress = () => {
    if (isPickup) {
      return `${t("pickupAddressLine")} ${storeLine}`.trim();
    }
    return form.address.trim();
  };

  const goToPayment = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(t("fillError"));
      return;
    }
    /** Iraqi mobile only (07XXXXXXXXX) — same rule the server enforces. */
    if (!isValidIraqiPhone(form.phone)) {
      setPhoneError(true);
      toast.error(t("phoneInvalid"));
      return;
    }
    if (!isPickup && !form.address.trim()) {
      toast.error(t("fillAddressError"));
      return;
    }
    setPaymentMethod((pm) =>
      allowedMethods.includes(pm) && methodFlags[pm]?.enabled ? pm : isPickup ? "store_pickup" : "cod",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep(2);
  };

  const goToReview = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep(3);
  };

  /** Maps a stable server rejection `code` to a localized message. Returns null
   *  when the code is unknown so callers fall back to a generic localized error
   *  (the API's raw `error` text is Arabic-only and must not be shown verbatim). */
  const localizedOrderError = (code?: string): string | null => {
    switch (code) {
      case "OUT_OF_STOCK":
        return t("orderOutOfStock");
      case "UNKNOWN_PRODUCT":
        return t("orderUnknownProduct");
      case "DELIVERY_RESTRICTED":
        return t("orderDeliveryRestricted");
      case "INVALID_PHONE":
        return t("orderInvalidPhone");
      case "INVALID_PAYMENT_METHOD":
        return t("orderInvalidPayment");
      case "PAYMENT_METHOD_UNAVAILABLE":
        return t("orderPaymentUnavailable");
      default:
        return null;
    }
  };

  const submitOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitFailed(false);

    /**
     * Open the WhatsApp tab synchronously inside the click gesture. If we wait
     * until after the awaited POST below, transient activation has expired and
     * popup blockers (Safari/Firefox/Chrome) silently swallow the handoff tab.
     * We point the placeholder tab at the final URL once the order resolves —
     * and CLOSE it on every failure path so the handoff only fires on genuine
     * success.
     */
    const waWindow = window.open("", "_blank");

    const phone = normalizeIraqiPhone(form.phone.trim());

    const orderItems = items.map((i) => ({
      productId: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
      image: i.images?.[0],
    }));

    const addressLine = resolveAddress();

    let orderNumber: string;

    const saveLocalOrder = () =>
      addOrder({
        customer: {
          name: form.name.trim(),
          phone,
          address: addressLine,
          city: form.city,
        },
        items: orderItems,
        total: lineSubtotal,
        shipping,
        discountTotal: couponDiscount,
        couponCode: couponCode ?? undefined,
        grandTotal,
        paymentMethod,
        notes: orderNotes.trim() || undefined,
      });

    try {
      const res = await fetch(freezoneApiUrl("/api/public/orders"), {
        method: "POST",
        // Send fz_customer_session so signed-in customers get the order linked.
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment: isPickup ? "pickup" : "delivery",
          paymentMethod,
          customer: {
            name: form.name.trim(),
            phone,
            address: addressLine,
            city: form.city,
          },
          items: orderItems,
          subtotal: lineSubtotal,
          discountTotal: couponDiscount,
          couponCode: couponCode ?? undefined,
          shipping,
          total: grandTotal,
          notes: orderNotes.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        orderNumber?: string;
        error?: string;
        code?: string;
      };

      if (res.ok && data.orderNumber) {
        orderNumber = data.orderNumber;
      } else if (res.status === 503 && data.code === "NO_DATABASE") {
        /** Dev-only fallback (no DATABASE_URL): saved locally with an explicit notice. */
        orderNumber = saveLocalOrder().orderNumber;
        toast.success(t("orderLocalFallback"));
      } else if (res.status === 400) {
        waWindow?.close();
        // Map stable server codes to localized strings; the raw `error` is
        // Arabic-only, so never echo it to non-Arabic shoppers.
        toast.error(localizedOrderError(data.code) ?? t("orderValidationError"));
        setSubmitting(false);
        return;
      } else {
        waWindow?.close();
        toast.error(localizedOrderError(data.code) ?? t("orderServerError"));
        setSubmitting(false);
        return;
      }
    } catch {
      /**
       * HONESTY FIX: a network failure is NOT a placed order. Keep a local
       * draft (once) so nothing the shopper typed is lost, but show a clear
       * failure state with retry instead of the old fake success screen —
       * and never open WhatsApp for an order the server never saw.
       */
      waWindow?.close();
      if (!draftSavedRef.current) {
        saveLocalOrder();
        draftSavedRef.current = true;
      }
      setSubmitFailed(true);
      setSubmitting(false);
      toast.error(t("orderNetworkFailTitle"));
      return;
    }

    const lines = [
      `*NEW ORDER*`,
      ``,
      `*Order #:* ${orderNumber}`,
      `*Fulfillment:* ${isPickup ? "Store pickup" : "Home delivery"}`,
      `*Customer:* ${form.name}`,
      `*Phone:* ${phone}`,
      `*City:* ${form.city}`,
      `*Address / pickup:* ${addressLine}`,
      ``,
      `*ITEMS:*`,
      ...items.map((i) => `• ${i.qty}× ${i.name} — ${new Intl.NumberFormat("en").format(i.price * i.qty)} IQD`),
      ``,
      `*Subtotal:* ${new Intl.NumberFormat("en").format(lineSubtotal)} IQD`,
      ...(couponDiscount > 0 && couponCode
        ? [`*Coupon ${couponCode}:* -${new Intl.NumberFormat("en").format(couponDiscount)} IQD`]
        : []),
      `*Shipping:* ${shipping === 0 ? "FREE" : `${new Intl.NumberFormat("en").format(shipping)} IQD`}`,
      `*TOTAL:* ${new Intl.NumberFormat("en").format(grandTotal)} IQD`,
      ``,
      `*Payment:* ${paymentWhatsAppLabel(paymentMethod)}`,
    ];

    if (paymentMethod === "zaincash" && zainDisplay) lines.push(`*ZainCash / wallet:* ${zainDisplay}`);
    if (paymentMethod === "qicard" && qiDisplay) lines.push(`*Qi Card ref:* ${qiDisplay}`);
    if (orderNotes.trim()) lines.push(``, `*Notes:* ${orderNotes.trim()}`);

    /** Device-local order memory — feeds the account page + track-order deep link. */
    rememberOrder({
      orderNumber,
      phone,
      total: grandTotal,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    const waUrl = `${WHATSAPP_ORDER_CHAT_URL}?text=${encodeURIComponent(lines.join("\n"))}`;
    if (waWindow) {
      waWindow.location.href = waUrl;
    } else {
      /* Placeholder tab was blocked outright — best-effort fallback. */
      window.open(waUrl, "_blank");
    }

    trackPurchase({
      orderNumber,
      total: grandTotal,
      shipping,
      items: items.map((i): AnalyticsItem => ({
        id: i.id, name: i.name, price: i.price, quantity: i.qty, brand: i.brand, category: i.cat,
      })),
    });

    clearCart();
    setSubmitting(false);
    setPlacedOrderNumber(orderNumber);
    setStep(4);
  };

  const methodTitle = (m: PaymentMethod) => {
    switch (m) {
      case "cod":
        return t("pm_cod");
      case "store_pickup":
        return t("pm_store_pickup");
      case "zaincash":
        return t("pm_zaincash");
      case "qicard":
        return t("pm_qicard");
      case "fib":
        return t("pm_fib");
      case "visa":
        return t("pm_visa");
      case "master":
        return t("pm_master");
    }
  };

  const methodDesc = (m: PaymentMethod) => {
    switch (m) {
      case "cod":
        return t("pm_cod_desc");
      case "store_pickup":
        return t("pm_store_pickup_desc");
      case "zaincash":
        return t("pm_zaincash_desc");
      case "qicard":
        return t("pm_qicard_desc");
      case "fib":
        return t("pm_fib_desc");
      case "visa":
        return t("pm_visa_desc");
      case "master":
        return t("pm_master_desc");
    }
  };

  /** Confirmation-screen note: how each (still unpaid) method actually settles. */
  const methodSettlement = (m: PaymentMethod) => {
    switch (m) {
      case "cod":
        return t("settle_cod");
      case "store_pickup":
        return t("settle_store_pickup");
      case "zaincash":
        return t("settle_zaincash");
      case "qicard":
        return t("settle_qicard");
      case "fib":
        return t("settle_fib");
      case "visa":
        return t("settle_visa");
      case "master":
        return t("settle_master");
    }
  };

  /** One payment option row. Unconfigured methods stay visible but disabled
   *  with a bilingual "coming soon" badge — no silently hidden options. */
  const renderMethodOption = (m: PaymentMethod) => {
    const Icon = methodIcon(m);
    const flags = methodFlags[m] ?? { enabled: false, comingSoon: true };
    const disabled = !flags.enabled;
    const active = paymentMethod === m;
    return (
      <label
        key={m}
        className={clsx(
          styles.paymentOption,
          styles.fullWidth,
          active && styles.activePayment,
          disabled && styles.disabledPayment,
        )}
        aria-disabled={disabled}
      >
        <input
          type="radio"
          name="pay"
          checked={active}
          disabled={disabled}
          onChange={() => setPaymentMethod(m)}
          className={styles.radioInput}
        />
        <Icon size={22} className={styles.paymentOptionIcon} aria-hidden />
        <div>
          <h4 className={styles.optionTitle}>
            {methodTitle(m)}
            {flags.comingSoon && <span className={styles.comingSoonBadge}>{t("comingSoon")}</span>}
          </h4>
          <p className={styles.optionDesc}>{disabled ? t("comingSoonDesc") : methodDesc(m)}</p>
        </div>
      </label>
    );
  };

  if (step === 4 && placedOrderNumber) {
    return (
      <div className={`container ${styles.successScreen}`}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={styles.successIcon}>
          <Check size={40} />
        </motion.div>
        <h1 className={`fz-type-h1 ${styles.successTitle}`}>{t("orderPlaced")}</h1>
        <p className={styles.successText}>{t("successMsg", { orderNumber: placedOrderNumber })}</p>
        <p className={styles.successText}>
          <strong>{t("paymentMethod")}:</strong> {methodTitle(paymentMethod)}
        </p>
        <p className={`fz-type-small ${styles.successText}`}>{methodSettlement(paymentMethod)}</p>
        <p className={`fz-type-small ${styles.successText}`}>{t("successFollowUp")}</p>
        <div className={styles.successActions}>
          <Link
            href={`/track-order?order=${encodeURIComponent(placedOrderNumber)}&phone=${encodeURIComponent(normalizeIraqiPhone(form.phone.trim()))}`}
            className="btn-outline"
          >
            {t("trackYourOrder")}
          </Link>
          <Link href="/" className="btn-primary">
            {t("returnHome")}
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return <Navigate to={`/${locale}/cart`} replace />;
  }

  return (
    <div className={`container ${styles.layout}`}>
      <Seo title={t("title")} noindex />
      <h1 className={styles.header}>{t("title")}</h1>
      <p className={styles.codNotice}>{t("checkoutIntro")}</p>

      <div className={styles.steps}>
        <div className={`${styles.step} ${step >= 1 ? styles.activeStep : ""} ${step > 1 ? styles.completedStep : ""}`}>
          <div className={styles.stepNumber}>{step > 1 ? <Check size={16} /> : 1}</div>
          <span className={styles.stepLabel}>{t("stepShipping")}</span>
        </div>
        <div className={`${styles.step} ${step >= 2 ? styles.activeStep : ""} ${step > 2 ? styles.completedStep : ""}`}>
          <div className={styles.stepNumber}>{step > 2 ? <Check size={16} /> : 2}</div>
          <span className={styles.stepLabel}>{t("stepPayment")}</span>
        </div>
        <div className={`${styles.step} ${step >= 3 ? styles.activeStep : ""}`}>
          <div className={styles.stepNumber}>3</div>
          <span className={styles.stepLabel}>{t("stepReview")}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={styles.card}>
            <h2 className={styles.cardTitle}>
              <Truck className={styles.cardTitleIcon} /> {t("shippingDetails")}
            </h2>

            <p className={`${styles.paymentGroupTitle} ${styles.paymentGroupTitleFirst}`}>
              {t("fulfillmentLabel")}
            </p>
            <div className={styles.formGrid}>
              <label className={clsx(styles.paymentOption, styles.fullWidth, fulfillment === "delivery" && styles.activePayment)}>
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === "delivery"}
                  onChange={() => setFulfillment("delivery")}
                  className={styles.radioInput}
                />
                <Truck size={22} className={styles.paymentOptionIcon} aria-hidden />
                <div>
                  <h4 className={styles.optionTitle}>{t("fulfillmentDelivery")}</h4>
                  <p className={styles.optionDesc}>{t("fulfillmentDeliveryDesc")}</p>
                </div>
              </label>
              <label className={clsx(styles.paymentOption, styles.fullWidth, fulfillment === "pickup" && styles.activePayment)}>
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === "pickup"}
                  onChange={() => setFulfillment("pickup")}
                  className={styles.radioInput}
                />
                <Building2 size={22} className={styles.paymentOptionIcon} aria-hidden />
                <div>
                  <h4 className={styles.optionTitle}>{t("fulfillmentPickup")}</h4>
                  <p className={styles.optionDesc}>{t("fulfillmentPickupDesc")}</p>
                </div>
              </label>
            </div>

            {isPickup && (
              <div className={styles.pickupBox}>
                <strong>{t("storeAddressLabel")}</strong>
                <p>{storeLine || t("storeAddressFallback")}</p>
              </div>
            )}

            <div className={`${styles.formGrid} ${styles.formGridSpaced}`}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="checkout-name">{t("fullName")}</label>
                <input id="checkout-name" required type="text" className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="checkout-phone">{t("phone")}</label>
                <input
                  id="checkout-phone"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={clsx(styles.input, phoneError && styles.inputError)}
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    if (phoneError) setPhoneError(false);
                  }}
                  onBlur={() => setPhoneError(form.phone.trim() !== "" && !isValidIraqiPhone(form.phone))}
                  aria-invalid={phoneError}
                  placeholder={t("phonePlaceholder")}
                />
                {phoneError && (
                  <p className={styles.inlineError} role="alert">
                    {t("phoneInvalid")}
                  </p>
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="checkout-city">{t("city")}</label>
                <select id="checkout-city" className={styles.input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                  {IRAQ_PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>
                      {provinceLabel(p)}
                    </option>
                  ))}
                </select>
                {!isPickup && (
                  <p className={styles.feeHint}>
                    {provinceFee === 0
                      ? t("provinceFeeFree")
                      : t("provinceFeeLine", { fee: new Intl.NumberFormat("en").format(provinceFee) })}
                    {threshold > 0 && (
                      <span> · {t("freeOverThreshold", { amount: new Intl.NumberFormat("en").format(threshold) })}</span>
                    )}
                  </p>
                )}
              </div>
              {!isPickup && (
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label className={styles.label} htmlFor="checkout-address">{t("address")}</label>
                  <input id="checkout-address" required type="text" className={styles.input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              )}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.label} htmlFor="checkout-notes">{t("orderNotes")}</label>
                <textarea id="checkout-notes" className={styles.textarea} rows={3} value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder={t("orderNotesPlaceholder")} />
              </div>
            </div>

            <div className={`${styles.buttons} ${styles.buttonsEnd}`}>
              <button type="button" className="btn-primary" onClick={goToPayment}>
                {t("continueToPayment")}
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={styles.card}>
            <h2 className={styles.cardTitle}>
              <CreditCard className={styles.cardTitleIcon} /> {t("paymentMethod")}
            </h2>

            <div className={styles.formGrid}>
              {!isPickup && (
                <>
                  <div className={styles.paymentGroupTitle}>{t("groupCashOnDelivery")}</div>
                  {allowedMethods.filter((m) => m === "cod").map(renderMethodOption)}
                </>
              )}

              {isPickup && (
                <>
                  <div className={styles.paymentGroupTitle}>{t("groupCashAtStore")}</div>
                  {allowedMethods.filter((m) => m === "store_pickup").map(renderMethodOption)}
                </>
              )}

              <div className={styles.paymentGroupTitle}>{t("groupElectronic")}</div>
              {allowedMethods.filter((m) => m !== "cod" && m !== "store_pickup").map(renderMethodOption)}

              {(paymentMethod === "zaincash" || paymentMethod === "qicard" || paymentMethod === "fib") && (
                <div className={styles.paymentHint}>
                  <strong>{t("electronicHintTitle")}</strong>
                  {paymentMethod === "zaincash" && (
                    <p>{zainDisplay ? t("zainWalletLine", { wallet: zainDisplay }) : t("zainWalletPending")}</p>
                  )}
                  {paymentMethod === "qicard" && <p>{qiDisplay ? t("qiMerchantLine", { id: qiDisplay }) : t("qiMerchantPending")}</p>}
                  <p>{t("electronicHintWhatsApp")}</p>
                </div>
              )}

              {(paymentMethod === "visa" || paymentMethod === "master") && (
                <div className={styles.paymentHint}>
                  <strong>{t("cardHintTitle")}</strong>
                  <p>{t("cardHintBody")}</p>
                </div>
              )}
            </div>

            <div className={styles.buttons}>
              <button type="button" className={styles.btnBack} onClick={() => setStep(1)}>
                {t("btnBack")}
              </button>
              <button type="button" className="btn-primary" onClick={goToReview}>
                {t("btnReview")}
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={styles.card}>
            <h2 className={styles.cardTitle}>
              <ClipboardList className={styles.cardTitleIcon} /> {t("finalReview")}
            </h2>

            <div className={styles.reviewBox}>
              <h4 className={styles.reviewTitle}>{t("shippingTo")}</h4>
              <p className={styles.reviewLine}>
                {form.name} • {form.phone}
              </p>
              <p className={styles.reviewLine}>{resolveAddress()}</p>
              <p className={styles.reviewLine}>
                {(() => {
                  const p = IRAQ_PROVINCES.find((x) => x.code === form.city);
                  return p ? provinceLabel(p) : form.city;
                })()}
              </p>
              <p className={styles.reviewStrong}>
                {t("fulfillmentShort")}: {isPickup ? t("fulfillmentPickup") : t("fulfillmentDelivery")}
              </p>
              <p className={styles.reviewStrong}>
                {t("paymentMethod")}: {methodTitle(paymentMethod)}
              </p>
              {orderNotes.trim() && (
                <p className={`fz-type-small ${styles.reviewLine} ${styles.reviewStrong}`}>
                  {t("orderNotes")}: {orderNotes}
                </p>
              )}
            </div>

            <div className={styles.summaryList}>
              {items.map((i) => (
                <div key={i.id} className={styles.summaryRow}>
                  <span>
                    {i.qty}× {i.name}
                  </span>
                  <span>{new Intl.NumberFormat("en").format(i.price * i.qty)} IQD</span>
                </div>
              ))}
              <div className={`${styles.summaryRow} ${styles.summaryRowSpaced}`}>
                <span>{t("subtotal")}</span>
                <span>{new Intl.NumberFormat("en").format(lineSubtotal)} IQD</span>
              </div>
              {couponDiscount > 0 && (
                <div className={styles.summaryRow}>
                  <span>{t("couponDiscount", { code: couponCode ?? "" })}</span>
                  <span className={styles.couponValue}>
                    −{new Intl.NumberFormat("en").format(couponDiscount)} IQD
                  </span>
                </div>
              )}
              <div className={styles.summaryRow}>
                <span>{t("stepShipping")}</span>
                <span>{shipping === 0 ? t("free") : `${new Intl.NumberFormat("en").format(shipping)} IQD`}</span>
              </div>
              <div className={styles.totalRow}>
                <span>{t("totalAmount")}</span>
                <span>{new Intl.NumberFormat("en").format(grandTotal)} IQD</span>
              </div>
            </div>

            {submitFailed && (
              <div className={styles.submitErrorBox} role="alert">
                <AlertTriangle size={20} className={styles.submitErrorIcon} aria-hidden />
                <div>
                  <strong>{t("orderNetworkFailTitle")}</strong>
                  <p>{t("orderNetworkFailBody")}</p>
                </div>
              </div>
            )}

            <div className={styles.buttons}>
              <button type="button" className={styles.btnBack} onClick={() => setStep(2)} disabled={submitting}>
                {t("btnBack")}
              </button>
              <button
                type="button"
                className={`btn-red ${styles.placeOrderBtn}`}
                onClick={submitOrder}
                disabled={submitting}
              >
                {submitting ? t("placingOrder") : submitFailed ? t("retryOrder") : t("placeOrder")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
