import { useCallback, useEffect, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { cartCount, useSiteCart } from "./cart";
import { formatMoney, plainText, productImage, productName, useCatalog } from "./catalog";
import { CloseIcon, MinusIcon, PlusIcon, TrashIcon } from "./icons";
import { useOverlay } from "./overlay";
import { useSiteUi } from "./ui";
import styles from "./site.module.css";

/**
 * The cart: a list kept in this browser, shown in a panel from the side. Its
 * button leads to the order form (CheckoutPage), where the visitor adds their
 * details and sends the order to the store as a WhatsApp message.
 */
export function CartPanel() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const open = useSiteCart((s) => s.open);
  const items = useSiteCart((s) => s.items);
  const setOpen = useSiteCart((s) => s.setOpen);
  const setQty = useSiteCart((s) => s.setQty);
  const remove = useSiteCart((s) => s.remove);
  const clear = useSiteCart((s) => s.clear);
  const { data: catalog } = useCatalog();
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), [setOpen]);
  useOverlay(open, close, closeRef);

  /** "Added to cart — view cart" has done its job once the cart is open. */
  useEffect(() => {
    if (open) useSiteUi.getState().clearToasts();
  }, [open]);

  if (!open) return null;

  /** Only products the catalogue still has (a saved cart can outlive a product). */
  const rows = catalog
    ? Object.entries(items).flatMap(([id, qty]) => {
        const p = catalog.byId.get(id);
        return p ? [{ p, qty }] : [];
      })
    : [];
  const total = rows.reduce((sum, r) => sum + r.p.price * r.qty, 0);
  const currency = t("currency");

  return (
    <div className={styles.cartLayer}>
      <button type="button" className={styles.cartScrim} aria-label={t("cartClose")} tabIndex={-1} onClick={() => setOpen(false)} />
      <div className={`${styles.cartPanel} ${styles.fromEnd}`} role="dialog" aria-modal="true" aria-labelledby="site-cart-title">
        <div className={styles.cartHead}>
          <h2 id="site-cart-title" className={styles.cartTitle}>
            {cartCount(items) > 0 ? t("cartCount", { count: cartCount(items) }) : t("cartTitle")}
          </h2>
          <button ref={closeRef} type="button" className={styles.iconBtn} aria-label={t("cartClose")} onClick={() => setOpen(false)}>
            <CloseIcon />
          </button>
        </div>
        {rows.length === 0 ? (
          <div className={styles.cartEmpty}>
            <span className={styles.cartEmptyTitle}>{catalog ? t("cartEmpty") : t("loading")}</span>
            {catalog ? <span className={styles.cartEmptyText}>{t("cartEmptyText")}</span> : null}
            <RouterLink to={`/${locale}/products`} className={styles.darkBtn} onClick={() => setOpen(false)}>
              {t("showAll")}
            </RouterLink>
          </div>
        ) : (
          <>
            <ul className={styles.cartList}>
              {rows.map(({ p, qty }) => {
                const name = plainText(productName(p, locale));
                return (
                  <li key={p.id} className={styles.cartItem}>
                    <RouterLink to={`/${locale}/product/${p.id}`} className={styles.cartThumb} onClick={() => setOpen(false)} tabIndex={-1} aria-hidden="true">
                      <img src={productImage(p.id, "small")} alt="" width={320} height={320} loading="lazy" decoding="async" />
                    </RouterLink>
                    <div className={styles.cartInfo}>
                      <RouterLink to={`/${locale}/product/${p.id}`} className={styles.cartName} onClick={() => setOpen(false)}>
                        {productName(p, locale)}
                      </RouterLink>
                      {p.model ? (
                        <span className={styles.cartModel} dir="ltr">
                          {p.model}
                        </span>
                      ) : null}
                      <div className={styles.cartRow}>
                        <div className={styles.qty} role="group" aria-label={t("cartQty")}>
                          <button type="button" className={styles.qtyBtn} aria-label={t("cartLess")} onClick={() => setQty(p.id, qty - 1)}>
                            <MinusIcon />
                          </button>
                          <span className={styles.qtyNum} dir="ltr" aria-live="polite">
                            {qty}
                          </span>
                          <button type="button" className={styles.qtyBtn} aria-label={t("cartMore")} onClick={() => setQty(p.id, qty + 1)}>
                            <PlusIcon />
                          </button>
                        </div>
                        <span className={styles.cartPrice}>
                          <span dir="ltr">{formatMoney(p.price * qty)}</span>
                          <span className={styles.cartCur}>{currency}</span>
                        </span>
                      </div>
                    </div>
                    <button type="button" className={styles.cartRemove} aria-label={t("cartRemove", { name })} onClick={() => remove(p.id)}>
                      <TrashIcon />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className={styles.cartFoot}>
              <div className={styles.cartTotal}>
                <span>{t("cartTotal")}</span>
                <span className={styles.cartTotalNum}>
                  <span dir="ltr">{formatMoney(total)}</span>
                  <span className={styles.cartCur}>{currency}</span>
                </span>
              </div>
              {/* The order form (details, then the WhatsApp message) is its own page. */}
              <RouterLink to={`/${locale}/checkout`} className={styles.cartOrder} onClick={() => setOpen(false)}>
                {t("cartCheckout")}
              </RouterLink>
              <span className={styles.cartNote}>{t("cartNote")}</span>
              <button type="button" className={styles.cartClear} onClick={clear}>
                {t("cartClear")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
