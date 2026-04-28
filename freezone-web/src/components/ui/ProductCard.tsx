"use client";

import { useMemo } from "react";
import { Link, useRouter } from "@/navigation";
import type { Category, Product } from "@/lib/data";
import { useCart } from "@/lib/store";
import { ShoppingCart, Heart } from "lucide-react";
import styles from "./ProductCard.module.css";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { buildProductSpecChips } from "@/lib/productSpecCardChips";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

export function ProductCard({
  product,
  categories,
  delay: _delay,
  specSearchLines,
}: {
  product: Product;
  /** When provided, spec chips use bilingual attribute names from the product's category. */
  categories?: Category[];
  delay?: number;
  /** When set (e.g. spec search), short lines explaining why the product matched. */
  specSearchLines?: { line1: string; line2?: string };
}) {
  const t = useTranslations("ProductCard");
  const tProducts = useTranslations("Products");
  const locale = useLocale();
  const router = useRouter();
  const { addItem } = useCart();
  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;

  const categoryFacetAttrs = useMemo(
    () => categories?.find((c) => c.id === product.cat)?.facetAttributes,
    [categories, product.cat],
  );

  const specChips = useMemo(
    () =>
      buildProductSpecChips(product, (labelKey) => tProducts(labelKey), {
        facetAttributes: categoryFacetAttrs,
        locale,
      }),
    [product, tProducts, categoryFacetAttrs, locale],
  );

  return (
    <div className={styles.cardMotion}>
    <Link
      href={`/product/${product.id}`}
      className={styles.card}
      prefetch
    >
      {/* Top Badges */}
      <div className={styles.badges}>
        {product.inStock ? (
          <span className={styles.stockBadgeIn}>{t("inStock")}</span>
        ) : (
          <span className={styles.stockBadgeOut}>{t("outOfStock")}</span>
        )}
        {discount > 0 && <span className={styles.discountBadge}>-{discount}%</span>}
        {product.isNew && !discount && <span className={styles.newBadge}>{tProducts("isNew")}</span>}
      </div>

      <button
        className={styles.wishlistBtn}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        title="Add to Wishlist"
      >
        <Heart size={16} />
      </button>

      {/* Image Area */}
      <div className={styles.imageWrapper}>
        {product.images && product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.name} className={styles.image} />
        ) : (
          <div className={styles.iconPlaceholder}>
             <span>{product.icon}</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className={styles.content}>
        <div className={styles.brand}>{product.brand}</div>
        <h3 className={styles.title}>{product.name}</h3>

        {specSearchLines ? (
          <div className={styles.searchMatchBlock}>
            <div className={styles.searchMatchLine}>{specSearchLines.line1}</div>
            {specSearchLines.line2 ? (
              <div className={styles.searchMatchLineMuted}>{specSearchLines.line2}</div>
            ) : null}
          </div>
        ) : null}

        {specChips.length > 0 ? (
          <div className={styles.specsRow}>
            {specChips.map((spec) => (
              <span key={spec.specKey} className={styles.specPill} title={spec.label}>
                <spec.Icon size={11} className={styles.specIcon} aria-hidden />
                <span className={styles.specPillText}>{spec.label}</span>
              </span>
            ))}
          </div>
        ) : null}

        <div className={styles.bottomSection}>
          <div className={styles.pricing}>
            {product.oldPrice && <span className={styles.oldPrice}>{formatMoney(product.oldPrice)}</span>}
            <span className={styles.price}>{formatMoney(product.price)} <span className={styles.currency}>IQD</span></span>
          </div>
        </div>
      </div>

      {/* Add to cart + buy now (checkout) */}
      <div className={styles.hoverAdd}>
        <div className={styles.hoverAddRow}>
          <button
            type="button"
            className={styles.addToCartBtn}
            disabled={!product.inStock}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!product.inStock) return;
              addItem(product);
            }}
          >
            <ShoppingCart size={16} aria-hidden /> {t("addToCart")}
          </button>
          <button
            type="button"
            className={styles.buyNowBtn}
            disabled={!product.inStock}
            aria-label={t("buyNowAria")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!product.inStock) return;
              addItem(product, 1);
              router.push("/checkout");
            }}
          >
            {t("buyNow")}
          </button>
        </div>
      </div>
    </Link>
    </div>
  );
}
