"use client";

import { useState } from "react";
import styles from "./checkout.module.css";
import { useCart, computeCheckoutTotals } from "@/lib/store";
import { usePublicSite } from "@/components/providers/StorefrontProvider";
import { useSite, PaymentMethod } from "@/lib/siteStore";
import { Check, Truck, CreditCard, ClipboardList, Banknote, Smartphone, WalletCards, Building2 } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/i18n/hooks";
import { freezoneApiUrl } from "@/lib/api-internal";
import clsx from "clsx";

type Fulfillment = "delivery" | "pickup";

/** WhatsApp Business click-to-chat (short link). Order text is appended as `?text=`. */
const WHATSAPP_ORDER_CHAT_URL = "https://wa.me/message/FWGAFHQGURU6H1" as const;

/** ترتيب طرق الدفع: نقد عند التوصيل ← إلكتروني (زين كاش، كي كارد، فيزا، ماستر) */
const PAYMENT_FOR_DELIVERY: PaymentMethod[] = ["cod", "zaincash", "qicard", "visa", "master"];

/** استلام من المقر: نقد في الشركة ← ثم نفس خيارات الإلكتروني */
const PAYMENT_FOR_PICKUP: PaymentMethod[] = ["store_pickup", "zaincash", "qicard", "visa", "master"];

function methodIcon(m: PaymentMethod) {
  switch (m) {
    case "cod":
      return Banknote;
    case "store_pickup":
      return Building2;
    case "zaincash":
      return Smartphone;
    case "qicard":
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
  const router = useRouter();

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
    city: "Baghdad",
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [orderNotes, setOrderNotes] = useState("");
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);

  const isPickup = fulfillment === "pickup";
  const { subtotal: lineSubtotal, shipping, grandTotal } = computeCheckoutTotals(items, {
    pickup: isPickup,
    threshold,
    shipFee,
    couponDiscount,
  });

  const allowedMethods = isPickup ? PAYMENT_FOR_PICKUP : PAYMENT_FOR_DELIVERY;

  const resolveAddress = () => {
    if (isPickup) {
      return `${t("pickupAddressLine")} ${storeLine}`.trim();
    }
    return form.address.trim();
  };

  const goToPayment = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      alert(t("fillError"));
      return;
    }
    if (!isPickup && !form.address.trim()) {
      alert(t("fillAddressError"));
      return;
    }
    const allowed = isPickup ? PAYMENT_FOR_PICKUP : PAYMENT_FOR_DELIVERY;
    setPaymentMethod((pm) => (allowed.includes(pm) ? pm : isPickup ? "store_pickup" : "cod"));
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep(2);
  };

  const goToReview = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep(3);
  };

  const submitOrder = async () => {
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
          phone: form.phone.trim(),
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment: isPickup ? "pickup" : "delivery",
          paymentMethod,
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
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
        orderNumber = saveLocalOrder().orderNumber;
        alert(t("orderLocalFallback"));
      } else if (res.status === 400) {
        alert(typeof data.error === "string" && data.error.trim() ? data.error : t("orderValidationError"));
        return;
      } else {
        alert(typeof data.error === "string" && data.error.trim() ? data.error : t("orderServerError"));
        return;
      }
    } catch {
      orderNumber = saveLocalOrder().orderNumber;
    }

    const lines = [
      `*NEW ORDER*`,
      ``,
      `*Order #:* ${orderNumber}`,
      `*Fulfillment:* ${isPickup ? "Store pickup" : "Home delivery"}`,
      `*Customer:* ${form.name}`,
      `*Phone:* ${form.phone}`,
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

    const waUrl = `${WHATSAPP_ORDER_CHAT_URL}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(waUrl, "_blank");

    clearCart();
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
      case "visa":
        return t("pm_visa_desc");
      case "master":
        return t("pm_master_desc");
    }
  };

  if (step === 4 && placedOrderNumber) {
    return (
      <div className={`container ${styles.successScreen}`}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={styles.successIcon}>
          <Check size={40} />
        </motion.div>
        <h1 style={{ fontFamily: "var(--fz-font-display)", fontSize: "3rem", fontWeight: 900, marginBottom: "16px" }}>{t("orderPlaced")}</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", marginBottom: "12px" }}>{t("successMsg", { orderNumber: placedOrderNumber })}</p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "32px" }}>{t("successFollowUp")}</p>
        <Link href="/" className="btn-primary">
          {t("returnHome")}
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    if (typeof window !== "undefined") {
      router.push("/cart");
    }
    return null;
  }

  return (
    <div className={`container ${styles.layout}`}>
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
              <Truck style={{ display: "inline-block", marginRight: "10px" }} /> {t("shippingDetails")}
            </h2>

            <p className={styles.paymentGroupTitle} style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
              {t("fulfillmentLabel")}
            </p>
            <div className={styles.formGrid}>
              <label className={clsx(styles.paymentOption, styles.fullWidth, fulfillment === "delivery" && styles.activePayment)}>
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === "delivery"}
                  onChange={() => setFulfillment("delivery")}
                  style={{ width: "20px", height: "20px", accentColor: "var(--accent-red, #0b1f3b)" }}
                />
                <Truck size={22} className={styles.paymentOptionIcon} aria-hidden />
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: "1.1rem" }}>{t("fulfillmentDelivery")}</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{t("fulfillmentDeliveryDesc")}</p>
                </div>
              </label>
              <label className={clsx(styles.paymentOption, styles.fullWidth, fulfillment === "pickup" && styles.activePayment)}>
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === "pickup"}
                  onChange={() => setFulfillment("pickup")}
                  style={{ width: "20px", height: "20px", accentColor: "var(--accent-red, #0b1f3b)" }}
                />
                <Building2 size={22} className={styles.paymentOptionIcon} aria-hidden />
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: "1.1rem" }}>{t("fulfillmentPickup")}</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{t("fulfillmentPickupDesc")}</p>
                </div>
              </label>
            </div>

            {isPickup && (
              <div className={styles.pickupBox}>
                <strong>{t("storeAddressLabel")}</strong>
                <p>{storeLine || t("storeAddressFallback")}</p>
              </div>
            )}

            <div className={styles.formGrid} style={{ marginTop: 20 }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t("fullName")}</label>
                <input required type="text" className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t("phone")}</label>
                <input required type="tel" inputMode="tel" autoComplete="tel" className={styles.input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t("phonePlaceholder")} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t("city")}</label>
                <select className={styles.input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                  <option value="Baghdad">بغداد / Baghdad</option>
                  <option value="Basra">البصرة / Basra</option>
                  <option value="Erbil">أربيل / Erbil</option>
                  <option value="Mosul">الموصل / Mosul</option>
                </select>
              </div>
              {!isPickup && (
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>{t("address")}</label>
                  <input required type="text" className={styles.input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              )}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>{t("orderNotes")}</label>
                <textarea className={styles.textarea} rows={3} value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder={t("orderNotesPlaceholder")} />
              </div>
            </div>

            <div className={styles.buttons} style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn-primary" onClick={goToPayment}>
                {t("continueToPayment")}
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={styles.card}>
            <h2 className={styles.cardTitle}>
              <CreditCard style={{ display: "inline-block", marginRight: "10px" }} /> {t("paymentMethod")}
            </h2>

            <div className={styles.formGrid}>
              {!isPickup && (
                <>
                  <div className={styles.paymentGroupTitle}>{t("groupCashOnDelivery")}</div>
                  {allowedMethods
                    .filter((m) => m === "cod")
                    .map((m) => {
                      const Icon = methodIcon(m);
                      const active = paymentMethod === m;
                      return (
                        <label key={m} className={clsx(styles.paymentOption, styles.fullWidth, active && styles.activePayment)}>
                          <input
                            type="radio"
                            name="pay"
                            checked={active}
                            onChange={() => setPaymentMethod(m)}
                            style={{ width: "20px", height: "20px", accentColor: "var(--accent-red, #0b1f3b)" }}
                          />
                          <Icon size={22} className={styles.paymentOptionIcon} aria-hidden />
                          <div>
                            <h4 style={{ fontWeight: 800, fontSize: "1.1rem" }}>{methodTitle(m)}</h4>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{methodDesc(m)}</p>
                          </div>
                        </label>
                      );
                    })}
                </>
              )}

              {isPickup && (
                <>
                  <div className={styles.paymentGroupTitle}>{t("groupCashAtStore")}</div>
                  {allowedMethods
                    .filter((m) => m === "store_pickup")
                    .map((m) => {
                      const Icon = methodIcon(m);
                      const active = paymentMethod === m;
                      return (
                        <label key={m} className={clsx(styles.paymentOption, styles.fullWidth, active && styles.activePayment)}>
                          <input
                            type="radio"
                            name="pay"
                            checked={active}
                            onChange={() => setPaymentMethod(m)}
                            style={{ width: "20px", height: "20px", accentColor: "var(--accent-red, #0b1f3b)" }}
                          />
                          <Icon size={22} className={styles.paymentOptionIcon} aria-hidden />
                          <div>
                            <h4 style={{ fontWeight: 800, fontSize: "1.1rem" }}>{methodTitle(m)}</h4>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{methodDesc(m)}</p>
                          </div>
                        </label>
                      );
                    })}
                </>
              )}

              <div className={styles.paymentGroupTitle}>{t("groupElectronic")}</div>
              {allowedMethods
                .filter((m) => m !== "cod" && m !== "store_pickup")
                .map((m) => {
                  const Icon = methodIcon(m);
                  const active = paymentMethod === m;
                  return (
                    <label key={m} className={clsx(styles.paymentOption, styles.fullWidth, active && styles.activePayment)}>
                      <input
                        type="radio"
                        name="pay"
                        checked={active}
                        onChange={() => setPaymentMethod(m)}
                        style={{ width: "20px", height: "20px", accentColor: "var(--accent-red, #0b1f3b)" }}
                      />
                      <Icon size={22} className={styles.paymentOptionIcon} aria-hidden />
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: "1.1rem" }}>{methodTitle(m)}</h4>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{methodDesc(m)}</p>
                      </div>
                    </label>
                  );
                })}

              {(paymentMethod === "zaincash" || paymentMethod === "qicard") && (
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
              <ClipboardList style={{ display: "inline-block", marginRight: "10px" }} /> {t("finalReview")}
            </h2>

            <div style={{ marginBottom: "24px", padding: "16px", background: "var(--gray-50)", borderRadius: "12px" }}>
              <h4 style={{ fontWeight: 800, marginBottom: "8px" }}>{t("shippingTo")}</h4>
              <p style={{ color: "var(--text-secondary)" }}>
                {form.name} • {form.phone}
              </p>
              <p style={{ color: "var(--text-secondary)" }}>{resolveAddress()}</p>
              <p style={{ color: "var(--text-secondary)" }}>{form.city}</p>
              <p style={{ marginTop: "10px", fontWeight: 700 }}>
                {t("fulfillmentShort")}: {isPickup ? t("fulfillmentPickup") : t("fulfillmentDelivery")}
              </p>
              <p style={{ marginTop: "6px", fontWeight: 700 }}>
                {t("paymentMethod")}: {methodTitle(paymentMethod)}
              </p>
              {orderNotes.trim() && (
                <p style={{ marginTop: "8px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
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
                  <span style={{ color: "var(--text-primary)" }}>{new Intl.NumberFormat("en").format(i.price * i.qty)} IQD</span>
                </div>
              ))}
              <div className={styles.summaryRow} style={{ marginTop: "16px" }}>
                <span>{t("subtotal")}</span>
                <span>{new Intl.NumberFormat("en").format(lineSubtotal)} IQD</span>
              </div>
              {couponDiscount > 0 && (
                <div className={styles.summaryRow}>
                  <span>كوبون {couponCode}</span>
                  <span style={{ color: "#059669" }}>
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

            <div className={styles.buttons}>
              <button type="button" className={styles.btnBack} onClick={() => setStep(2)}>
                {t("btnBack")}
              </button>
              <button type="button" className="btn-red" onClick={submitOrder} style={{ fontSize: "1.1rem", padding: "16px 32px" }}>
                {t("placeOrder")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
