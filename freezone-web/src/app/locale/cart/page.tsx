"use client";

import { useState } from "react";
import styles from "./cart.module.css";
import { useCart, computeCartTotals } from "@/lib/store";
import { usePublicSite } from "@/components/providers/StorefrontProvider";
import { Link } from "@/navigation";
import { Trash2, ShoppingBag, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/i18n/hooks";
import { freezoneApiUrl } from "@/lib/api-internal";
import { Seo } from "@/components/seo/Seo";
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

export default function CartPage() {
  const t = useTranslations("Cart");
  const { items, updateQty, removeItem, clearCart, couponCode, couponDiscount, setCoupon } = useCart();
  const site = usePublicSite();
  const threshold = site.freeDeliveryThreshold ?? 100000;
  const shipFee = site.standardShippingFee ?? 5000;
  const { subtotal: lineSubtotal, shipping, grandTotal } = computeCartTotals(
    items,
    threshold,
    shipFee,
    couponDiscount,
  );

  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function applyCoupon() {
    setCouponMsg(null);
    const code = couponInput.trim();
    if (!code) {
      setCoupon(null, 0);
      return;
    }
    const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
    try {
      const res = await fetch(freezoneApiUrl("/api/public/coupon/validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: sub }),
      });
      const j = (await res.json()) as { ok?: boolean; discount?: number; code?: string; error?: string };
      if (!res.ok || !j.ok) {
        setCouponMsg({ text: j.error ?? t("couponFailed"), error: true });
        setCoupon(null, 0);
        return;
      }
      setCoupon(j.code ?? code.toUpperCase(), j.discount ?? 0);
      setCouponMsg({ text: t("couponApplied"), error: false });
    } catch {
      setCouponMsg({ text: t("couponFailed"), error: true });
      setCoupon(null, 0);
    }
  }

  return (
    <>
      <Seo title={t("title")} noindex />
      {/* Page Hero */}
      <div className={styles.pageHero}>
        <div className="container">
          <motion.h1
            className={styles.heroTitle}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <ShoppingCart size={32} />
            {t("title")}
            {items.length > 0 && (
              <span className={styles.heroCount}>{t("itemsCount", { count: items.length })}</span>
            )}
          </motion.h1>
        </div>
      </div>

      <div className={`container ${styles.layout}`}>
        {items.length === 0 ? (
          <motion.div
            className={styles.emptyState}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <ShoppingBag size={64} color="var(--color-neutral-300)" />
            <h2>{t("emptyTitle")}</h2>
            <p>{t("emptySub")}</p>
            <Link href="/products" className={`btn-primary ${styles.emptyCta}`}>
              {t("continueShopping")}
            </Link>
          </motion.div>
        ) : (
          <div className={styles.content}>
            {/* Items */}
            <div className={styles.itemsCol}>
              <AnimatePresence mode="popLayout">
              {items.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  className={styles.cartItem}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, transition: { duration: 0.22 } }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                >
                  {item.images?.[0] ? (
                    <ResponsiveImage
                      src={item.images[0]}
                      alt={item.name}
                      className={styles.itemImage}
                      sizes="100px"
                      aspectRatio={1}
                    />
                  ) : (
                    <div className={styles.itemImage} aria-hidden />
                  )}
                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemName}>{item.name}</h3>
                    <div className={styles.itemBrand}>{item.brand}</div>
                    <div className={styles.itemPrice}>{formatMoney(item.price)} IQD</div>
                  </div>

                  <div className={styles.qtyControls}>
                    <button className={styles.qtyBtn} onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                    <span className={styles.qtyNum}>{item.qty}</span>
                    <button className={styles.qtyBtn} onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                  </div>

                  <motion.button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className={styles.removeItemBtn}
                    title={t("removeItem")}
                    aria-label={t("removeItem")}
                    whileTap={{ scale: 0.92 }}
                  >
                    <Trash2 size={18} aria-hidden />
                  </motion.button>
                </motion.div>
              ))}
              </AnimatePresence>

              <button type="button" onClick={clearCart} className={styles.clearCartBtn}>
                {t("clearCart")}
              </button>
            </div>

            {/* Summary */}
            <motion.div
              className={styles.summaryCol}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className={styles.summaryTitle}>{t("orderSummary")}</h2>

              <div className={styles.couponBlock}>
                <div className={styles.couponRow}>
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder={t("couponPlaceholder")}
                    className={styles.couponInput}
                  />
                  <button
                    type="button"
                    className={`btn-outline ${styles.couponBtn}`}
                    onClick={() => void applyCoupon()}
                  >
                    {t("couponApply")}
                  </button>
                  {(couponCode || couponDiscount > 0) && (
                    <button
                      type="button"
                      className={styles.couponClearBtn}
                      onClick={() => {
                        setCoupon(null, 0);
                        setCouponInput("");
                        setCouponMsg(null);
                      }}
                    >
                      {t("couponRemove")}
                    </button>
                  )}
                </div>
                {couponMsg && (
                  <p className={`${styles.couponMsg} ${couponMsg.error ? styles.couponMsgError : ""}`}>
                    {couponMsg.text}
                  </p>
                )}
              </div>

              <div className={styles.summaryRow}>
                <span>{t("subtotal", { count: items.reduce((s, i) => s + i.qty, 0) })}</span>
                <span>{formatMoney(lineSubtotal)} IQD</span>
              </div>
              {couponDiscount > 0 && (
                <div className={styles.summaryRow}>
                  <span>{t("couponDiscount", { code: couponCode ?? "" })}</span>
                  <span className={styles.couponDiscountValue}>−{formatMoney(couponDiscount)} IQD</span>
                </div>
              )}
              <div className={styles.summaryRow}>
                <span>{t("shipping")}</span>
                <span className={shipping === 0 ? styles.freeShipping : undefined}>
                  {shipping === 0 ? t("free") : `${formatMoney(shipping)} IQD`}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span>{t("taxes")}</span>
                <span>{t("included")}</span>
              </div>

              <div className={styles.summaryTotal}>
                <span>{t("total")}</span>
                <span>{formatMoney(grandTotal)} IQD</span>
              </div>

              <Link href="/checkout" className={`btn-primary ${styles.actionBtn}`}>
                {t("proceedToCheckout")}
              </Link>
              <Link href="/products" className={styles.continueLink}>
                {t("continueShopping")}
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}
