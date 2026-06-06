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
  const [couponMsg, setCouponMsg] = useState("");

  async function applyCoupon() {
    setCouponMsg("");
    const code = couponInput.trim();
    if (!code) {
      setCoupon(null, 0);
      return;
    }
    const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
    const res = await fetch(freezoneApiUrl("/api/public/coupon/validate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal: sub }),
    });
    const j = (await res.json()) as { ok?: boolean; discount?: number; code?: string; error?: string };
    if (!res.ok || !j.ok) {
      setCouponMsg(j.error ?? "فشل التحقق");
      setCoupon(null, 0);
      return;
    }
    setCoupon(j.code ?? code.toUpperCase(), j.discount ?? 0);
    setCouponMsg("تم تطبيق الكوبون");
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
            <Link href="/products" className="btn-primary" style={{ display: "inline-block", marginTop: "8px", padding: "12px 28px" }}>
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
                    style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", padding: "8px", borderRadius: "8px", transition: "background 0.2s" }}
                    title="Remove item"
                    whileTap={{ scale: 0.92 }}
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </motion.div>
              ))}
              </AnimatePresence>

              <button
                onClick={clearCart}
                style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", padding: "8px 0", marginTop: "4px", fontWeight: "600", textDecoration: "underline", fontSize: "0.85rem" }}
              >
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

              <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="رمز الكوبون"
                    style={{
                      flex: 1,
                      minWidth: 120,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border-light, #e2e8f0)",
                    }}
                  />
                  <button type="button" className="btn-outline" onClick={() => void applyCoupon()} style={{ padding: "10px 16px" }}>
                    تطبيق
                  </button>
                  {(couponCode || couponDiscount > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoupon(null, 0);
                        setCouponInput("");
                        setCouponMsg("");
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border-light)",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      إزالة
                    </button>
                  )}
                </div>
                {couponMsg && <p style={{ fontSize: 12, margin: 0, color: couponMsg.includes("فشل") ? "#b91c1c" : "#059669" }}>{couponMsg}</p>}
              </div>

              <div className={styles.summaryRow}>
                <span>{t("subtotal", { count: items.reduce((s, i) => s + i.qty, 0) })}</span>
                <span>{formatMoney(lineSubtotal)} IQD</span>
              </div>
              {couponDiscount > 0 && (
                <div className={styles.summaryRow}>
                  <span>خصم {couponCode}</span>
                  <span style={{ color: "#059669", fontWeight: 700 }}>−{formatMoney(couponDiscount)} IQD</span>
                </div>
              )}
              <div className={styles.summaryRow}>
                <span>{t("shipping")}</span>
                <span style={{ color: shipping === 0 ? "#059669" : "inherit", fontWeight: 700 }}>
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

              <Link href="/checkout" className={`btn-primary ${styles.actionBtn}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px 20px", fontSize: "1rem", fontWeight: "800", marginBottom: "10px" }}>
                {t("proceedToCheckout")}
              </Link>
              <Link href="/products" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 20px", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1.5px solid var(--border-light)", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "0.9rem", transition: "all 0.2s", width: "100%", textDecoration: "none" }}>
                {t("continueShopping")}
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}
