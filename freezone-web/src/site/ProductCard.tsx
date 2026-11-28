import { useEffect, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { useAddToCart, useFavorite } from "./actions";
import { useSiteCart } from "./cart";
import {
  formatMoney,
  labelOf,
  plainText,
  productImage,
  productKind,
  productName,
  type SiteCatalog,
  type SiteProduct,
} from "./catalog";
import { CartIcon, CheckIcon, HeartIcon } from "./icons";
import styles from "./ProductCard.module.css";

/** Largest price size that still fits beside the cart button in a narrow card. */
function priceFontSize(money: string): string {
  const digits = money.replace(/,/g, "").length;
  const em = digits * 0.63 + (money.length - digits) * 0.31;
  return `clamp(12px, calc((100cqi - 108px) / ${em.toFixed(2)}), 18px)`;
}

export function ProductCard({ product: p, catalog }: { product: SiteProduct; catalog: SiteCatalog }) {
  const t = useTranslations("Site");
  const locale = useLocale();
  const location = useLocation();
  const add = useAddToCart();
  const inCart = useSiteCart((s) => s.items[p.id] ?? 0);
  const fav = useFavorite(p.id);
  /** The cart button shows a tick for a moment after each add. */
  const [added, setAdded] = useState(0);
  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(0), 1400);
    return () => window.clearTimeout(timer);
  }, [added]);
  const name = plainText(productName(p, locale));
  const subName = labelOf(catalog.subById.get(p.sub), locale);
  const meta = p.brand ? `${p.brand} · ${subName}` : subName;
  const money = formatMoney(p.price);
  const isOut = p.flag === "out";

  return (
    <article className={styles.prod}>
      <RouterLink
        to={`/${locale}/product/${p.id}`}
        /* Lets the product page send the visitor back to the list as they left it. */
        state={{ from: location.pathname + location.search }}
        className={styles.prodLink}
        aria-label={t("viewProduct", { name })}
      >
        <span className={styles.prodMedia}>
          <img
            src={productImage(p.id, "small")}
            srcSet={`${productImage(p.id, "small")} 320w, ${productImage(p.id)} 640w`}
            sizes="(max-width: 640px) 46vw, 260px"
            alt=""
            width={640}
            height={640}
            loading="lazy"
            decoding="async"
            className={styles.prodImg}
          />
        </span>
        <span className={styles.prodText}>
          <span className={styles.prodMeta}>{meta}</span>
          <span className={styles.prodName}>{productKind(p, locale)}</span>
          <span className={styles.prodModel} dir="ltr">
            {p.model || "—"}
          </span>
        </span>
      </RouterLink>
      <div className={styles.prodFoot}>
        <span className={styles.prodPrice}>
          <span className={styles.prodAmount} dir="ltr" style={{ fontSize: priceFontSize(money) }}>
            {money}
          </span>
          <span className={styles.prodCurrency}>{t("currency")}</span>
        </span>
        <button
          type="button"
          className={`${styles.prodCart} ${added ? styles.prodCartDone : ""}`}
          disabled={isOut}
          aria-label={
            isOut
              ? t("outNamed", { name })
              : inCart > 0
                ? t("inCartNamed", { name, count: inCart })
                : t("addToCartNamed", { name })
          }
          onClick={() => {
            if (isOut) return;
            add(p);
            setAdded((n) => n + 1);
          }}
        >
          {added ? <CheckIcon size={20} /> : <CartIcon size={20} />}
          {inCart > 0 && !isOut ? (
            <span key={inCart} className={styles.prodCartCount} dir="ltr" aria-hidden="true">
              {inCart}
            </span>
          ) : null}
        </button>
      </div>
      <button
        type="button"
        className={`${styles.fav} ${fav.on ? styles.favOn : ""}`}
        aria-pressed={fav.on}
        aria-label={t(fav.on ? "favRemove" : "favAdd", { name })}
        onClick={fav.toggle}
      >
        <span className={styles.favDisc}>
          <HeartIcon size={18} filled={fav.on} />
        </span>
      </button>
      {isOut ? (
        <span className={`${styles.badge} ${styles.badgeOut}`}>{t("badgeOut")}</span>
      ) : p.flag === "new" ? (
        <span className={`${styles.badge} ${styles.badgeNew}`}>{t("badgeNew")}</span>
      ) : null}
    </article>
  );
}

/** Same boxes as a product card, in grey, while the catalogue loads. */
export function GhostCard() {
  return (
    <div className={`${styles.prod} ${styles.prodGhost}`} aria-hidden="true">
      <span className={styles.prodMedia} />
      <span className={styles.prodText}>
        <span className={styles.ghostBar} style={{ width: "55%", marginBlock: 3 }} />
        <span className={styles.prodName}>
          <span className={styles.ghostBar} style={{ width: "90%", marginTop: 6 }} />
        </span>
        <span className={styles.prodModel} />
      </span>
      <div className={styles.prodFoot}>
        <span className={styles.ghostBar} style={{ width: "45%", height: 16 }} />
        <span className={styles.prodCart} style={{ background: "#f0efed" }} />
      </div>
    </div>
  );
}
