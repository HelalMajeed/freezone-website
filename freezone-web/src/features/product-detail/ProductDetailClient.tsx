"use client";

import { useMemo } from "react";
import type { Product, Category } from "@/lib/data";
import { ProductCard } from "@/components/ui/ProductCard";
import { ImageGallery } from "@/components/ui/ImageGallery";
import { useCart } from "@/lib/store";
import { CreditCard, ShoppingCart } from "lucide-react";
import styles from "./productDetail.module.css";
import { Link, useRouter } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { buildProductSpecAttributeRows } from "@/lib/productSpecCardChips";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

export default function ProductDetailClient({
  product,
  categories,
  relatedProducts,
}: {
  product: Product;
  categories: Category[];
  relatedProducts: Product[];
}) {
  const t = useTranslations("ProductDetail");
  const tProducts = useTranslations("Products");
  const locale = useLocale();
  const router = useRouter();
  const { addItem } = useCart();

  const category = categories.find((c) => c.id === product.cat);

  const related = useMemo(() => relatedProducts, [relatedProducts]);

  const modelDisplay = useMemo(() => {
    const fromProduct = product.model?.trim();
    if (fromProduct) return fromProduct;
    const fromSpec = product.specs?.model?.trim();
    if (fromSpec) return fromSpec;
    const s = product.sku?.trim();
    if (s && s !== "—") return s;
    return "";
  }, [product]);

  const filterableKeys = useMemo(
    () => new Set((category?.facetAttributes ?? []).filter((a) => a.filterable !== false).map((a) => a.key)),
    [category?.facetAttributes],
  );

  const specAttributeRows = useMemo(
    () =>
      buildProductSpecAttributeRows(
        product,
        (labelKey) => {
          const short = tProducts(`${labelKey}Short`, { defaultValue: "" });
          if (typeof short === "string" && short.trim() !== "") return short.trim();
          return tProducts(labelKey);
        },
        {
          omitSpecKeys: modelDisplay ? ["model"] : [],
          facetAttributes: category?.facetAttributes,
          locale,
        },
      ),
    [product, tProducts, modelDisplay, category?.facetAttributes, locale],
  );

  const filterSpecRows = useMemo(() => {
    if (!category?.facetAttributes?.length) return specAttributeRows;
    return specAttributeRows.filter((r) => filterableKeys.has(r.specKey));
  }, [specAttributeRows, filterableKeys, category?.facetAttributes]);

  const extendedSpecRows = useMemo(() => {
    if (!category?.facetAttributes?.length) return [];
    return specAttributeRows.filter((r) => !filterableKeys.has(r.specKey));
  }, [specAttributeRows, filterableKeys, category?.facetAttributes]);

  const legacyStorage = product.storage?.trim() ?? "";
  const hasStorageInSpecs =
    product.specs &&
    (Object.prototype.hasOwnProperty.call(product.specs, "storage") ||
      Object.prototype.hasOwnProperty.call(product.specs, "storageType"));
  const showLegacyStorageRow =
    legacyStorage.length > 0 &&
    !hasStorageInSpecs &&
    specAttributeRows.every((r) => r.specKey !== "storage" && r.specKey !== "storageType");

  return (
    <div className={`container ${styles.pdpWide} ${styles.pdpLayout}`}>
      <nav className={styles.breadcrumb}>
        <Link href="/" prefetch>
          {t("home")}
        </Link>
        <span className={styles.separator}>/</span>
        <Link href="/products" prefetch>
          {t("products")}
        </Link>
        <span className={styles.separator}>/</span>
        <Link href={`/products?cat=${product.cat}`} prefetch>
          {category?.name || product.cat}
        </Link>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>{product.name}</span>
      </nav>

      <div className={styles.productGrid}>
        <div className={styles.mediaCol}>
          <ImageGallery
            images={product.images || []}
            model3d={product.model3d}
            alt={product.name}
          />
        </div>

        <div className={styles.infoCol}>
          <div className={styles.metaRow}>
            <span>{product.brand}</span>
            <span>·</span>
            <span style={{ color: category?.color }}>{category?.name}</span>
          </div>

          <h1 className={styles.title}>{product.name}</h1>

          <div className={styles.priceRow}>
            <span className={styles.price}>{formatMoney(product.price)} IQD</span>
            {product.oldPrice && (
              <span className={styles.oldPrice}>{formatMoney(product.oldPrice)} IQD</span>
            )}
          </div>

          <div className={styles.badgeRow}>
            {product.inStock ? (
              <span className={`${styles.badge} ${styles.badgeStock}`}>{t("inStock")}</span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeOut}`}>{t("outOfStock")}</span>
            )}
            {product.isNew && <span className={`${styles.badge} ${styles.badgeNew}`}>{t("newArrival")}</span>}
            {product.featured && (
              <span className={`${styles.badge} ${styles.badgeFeatured}`}>{t("featured")}</span>
            )}
          </div>

          <p className={styles.desc}>{product.desc}</p>

          <div className={styles.attributes} aria-label={t("specificationsAria")}>
            <div className={styles.attrRow}>
              <span className={styles.attrLabel}>{t("brand")}</span>
              <span className={styles.attrValue}>{product.brand}</span>
            </div>
            {modelDisplay ? (
              <div className={styles.attrRow}>
                <span className={styles.attrLabel}>{t("model")}</span>
                <span className={styles.attrValue}>{modelDisplay}</span>
              </div>
            ) : null}
            {filterSpecRows.map((row) => (
              <div key={row.specKey} className={styles.attrRow}>
                <span className={styles.attrLabel}>{row.label}</span>
                <span className={styles.attrValue}>{row.value}</span>
              </div>
            ))}
            {extendedSpecRows.length > 0 ? (
              <>
                <p className={styles.specSectionTitle}>{t("extendedSpecsTitle")}</p>
                {extendedSpecRows.map((row) => (
                  <div key={row.specKey} className={styles.attrRow}>
                    <span className={styles.attrLabel}>{row.label}</span>
                    <span className={styles.attrValue}>{row.value}</span>
                  </div>
                ))}
              </>
            ) : null}
            {showLegacyStorageRow ? (
              <div className={styles.attrRow}>
                <span className={styles.attrLabel}>{t("storageSpecs")}</span>
                <span className={styles.attrValue}>{legacyStorage}</span>
              </div>
            ) : null}
          </div>

          <div className={styles.actionStack}>
            <button
              type="button"
              className={`btn-primary ${styles.actionBtn}`}
              onClick={() => addItem(product)}
              disabled={!product.inStock}
            >
              <ShoppingCart size={20} aria-hidden />
              {product.inStock ? t("addToCart") : t("unavailable")}
            </button>
            <button
              type="button"
              className={styles.buyNowBtn}
              disabled={!product.inStock}
              aria-label={t("buyNowAria")}
              onClick={() => {
                if (!product.inStock) return;
                addItem(product, 1);
                router.push("/checkout");
              }}
            >
              <CreditCard size={20} aria-hidden />
              {t("buyNow")}
            </button>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <MotionReveal direction="up" delay={0.05}>
          <section className={styles.relatedSection}>
            <h2 className={styles.relatedTitle}>{t("relatedTitle")}</h2>
            <div className={styles.relatedGrid}>
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} categories={categories} delay={i * 50} />
              ))}
            </div>
          </section>
        </MotionReveal>
      )}
    </div>
  );
}
