"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, ShoppingCart, ShoppingBag, Trash2, Minus, Plus } from "lucide-react";
import { Link, usePathname } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { useCart, computeCartTotals } from "@/lib/store";
import { usePublicSite } from "@/components/providers/StorefrontProvider";
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";
import styles from "./CartDrawer.module.css";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Slide-over mini cart, rendered by the NavBar and driven by the cart store's
 * `isOpen` flag (`addItem` already opens it; the header cart button toggles it).
 * RTL-aware: anchored to the inline-end edge and slides from the matching side.
 */
export function CartDrawer() {
  const locale = useLocale();
  const t = useTranslations("cart");
  const { items, isOpen, toggleCart, updateQty, removeItem, couponDiscount } = useCart();
  const site = usePublicSite();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const ar = locale === "ar";
  /** Drawer sits at inline-end: offscreen is +100% in LTR (right), -100% in RTL (left). */
  const offX = ar ? "-100%" : "100%";

  const threshold = site.freeDeliveryThreshold ?? 0;
  const shipFee = site.standardShippingFee ?? 0;
  const { subtotal, afterDiscount, shipping } = computeCartTotals(
    items,
    threshold,
    shipFee,
    couponDiscount,
  );
  const count = items.reduce((acc, i) => acc + i.qty, 0);
  const remaining = Math.max(0, threshold - afterDiscount);
  const progress = threshold > 0 ? Math.min(100, Math.round((afterDiscount / threshold) * 100)) : 0;

  /** Close when the route changes (e.g. after “View cart” / “Checkout”). */
  const wasPathRef = useRef(pathname);
  useEffect(() => {
    if (wasPathRef.current !== pathname) {
      wasPathRef.current = pathname;
      if (useCart.getState().isOpen) toggleCart(false);
    }
  }, [pathname, toggleCart]);

  /** Focus management + Escape + Tab trap + body scroll lock while open. */
  useEffect(() => {
    if (!isOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 30);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        toggleCart(false);
        return;
      }
      if (e.key !== "Tab") return;
      const root = drawerRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      lastFocusedRef.current?.focus?.();
    };
  }, [isOpen, toggleCart]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={() => toggleCart(false)}
            aria-hidden
          />
          <motion.div
            ref={drawerRef}
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label={t("drawerTitle")}
            initial={{ x: offX }}
            animate={{ x: 0 }}
            exit={{ x: offX }}
            transition={
              reduceMotion ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 260 }
            }
          >
            <div className={styles.header}>
              <h2 className={styles.title}>
                <ShoppingCart size={20} aria-hidden />
                {t("drawerTitle")}
                {count > 0 ? (
                  <span className={styles.countBadge}>{t("itemsCount", { count })}</span>
                ) : null}
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                className={styles.closeBtn}
                onClick={() => toggleCart(false)}
                aria-label={t("close")}
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            {items.length === 0 ? (
              <div className={styles.empty}>
                <ShoppingBag size={48} aria-hidden />
                <p className={styles.emptyTitle}>{t("empty")}</p>
                <p className={styles.emptyHint}>{t("emptyHint")}</p>
                <Link href="/products" className="btn-primary" onClick={() => toggleCart(false)}>
                  {t("browse")}
                </Link>
              </div>
            ) : (
              <>
                <div className={styles.items}>
                  {items.map((item) => (
                    <div key={item.id} className={styles.item}>
                      {item.images?.[0] ? (
                        <ResponsiveImage
                          src={item.images[0]}
                          alt=""
                          className={styles.thumb}
                          sizes="64px"
                          aspectRatio={1}
                        />
                      ) : (
                        <div className={styles.thumb} aria-hidden />
                      )}
                      <div className={styles.itemBody}>
                        <p className={styles.itemName}>{item.name}</p>
                        <div className={styles.itemPrice}>{formatMoney(item.price)} IQD</div>
                        <div className={styles.qtyRow}>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            aria-label={t("decreaseQty", { name: item.name })}
                          >
                            <Minus size={14} aria-hidden />
                          </button>
                          <span className={styles.qtyNum}>{item.qty}</span>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            aria-label={t("increaseQty", { name: item.name })}
                          >
                            <Plus size={14} aria-hidden />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeItem(item.id)}
                        aria-label={t("remove", { name: item.name })}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>

                <div className={styles.footer}>
                  {threshold > 0 ? (
                    shipping === 0 ? (
                      <p className={styles.shipUnlocked} role="status">
                        {t("freeShipUnlocked")}
                      </p>
                    ) : (
                      <>
                        <p className={styles.shipHint}>
                          {t("freeShipProgress", { amount: formatMoney(remaining) })}
                        </p>
                        <div className={styles.progressTrack} aria-hidden>
                          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                        </div>
                      </>
                    )
                  ) : null}
                  <div className={styles.subtotalRow}>
                    <span>{t("subtotal")}</span>
                    <span>{formatMoney(subtotal)} IQD</span>
                  </div>
                  <p className={styles.note}>{t("shippingNote")}</p>
                  <div className={styles.ctaRow}>
                    <Link href="/cart" className="btn-outline" onClick={() => toggleCart(false)}>
                      {t("viewCart")}
                    </Link>
                    <Link href="/checkout" className="btn-primary" onClick={() => toggleCart(false)}>
                      {t("checkout")}
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
