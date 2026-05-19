"use client";

import { useMemo } from "react";
import type { Product, Category } from "@/lib/data";
import type { ProductDetailSpecGroup } from "@/lib/product-detail";
import { ProductCard } from "@/components/ui/ProductCard";
import { ImageGallery } from "@/components/ui/ImageGallery";
import { useCart } from "@/lib/store";
import { CreditCard, ShoppingCart } from "lucide-react";
import styles from "./productDetail.module.css";
import { Link, useRouter } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { MotionReveal } from "@/components/motion/MotionReveal";
import {
  formatSpecValueForDisplay,
  groupSpecRowsByDisplayGroup,
  humanizeDisplayGroup,
} from "@/lib/classification/spec-display";
import { buildProductSpecAttributeRows } from "@/lib/productSpecCardChips";
import type { FacetAttributeDef } from "@/lib/data";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

function formatGroupedSpecsForUi(
  groups: ProductDetailSpecGroup[],
  attributes: FacetAttributeDef[],
  locale: "en" | "ar",
): { groupTitle: string; rows: { key: string; label: string; value: string }[] }[] {
  const attrByKey = new Map(attributes.map((a) => [a.key, a]));
  return groups.map((g) => ({
    groupTitle: locale === "ar" ? g.groupLabel.ar : g.groupLabel.en,
    rows: g.items.map((item) => ({
      key: item.key,
      label: item.label,
      value: formatSpecValueForDisplay(item.value, attrByKey.get(item.key), locale),
    })),
  }));
}

export default function ProductDetailClient({
  product,
  categories,
  relatedProducts,
  groupedSpecs = [],
  attributes = [],
}: {
  product: Product;
  categories: Category[];
  relatedProducts: Product[];
  groupedSpecs?: ProductDetailSpecGroup[];
  attributes?: FacetAttributeDef[];
}) {
  const t = useTranslations("ProductDetail");
  const locale = useLocale();
  const router = useRouter();
  const { addItem } = useCart();

  const category = categories.find((c) => c.id === product.cat);
  const facetAttrs = attributes.length ? attributes : category?.facetAttributes;

  const modelDisplay = useMemo(() => {
    const fromProduct = product.model?.trim();
    if (fromProduct) return fromProduct;
    const fromSpec = product.specs?.model?.trim();
    if (fromSpec) return fromSpec;
    const s = product.sku?.trim();
    if (s && s !== "—") return s;
    return "";
  }, [product]);

  const specSections = useMemo(() => {
    if (groupedSpecs.length) {
      return formatGroupedSpecsForUi(groupedSpecs, facetAttrs ?? [], locale);
    }
    const rows = buildProductSpecAttributeRows(
      product,
      (labelKey) => labelKey,
      {
        omitSpecKeys: modelDisplay ? ["model", "brand"] : ["brand"],
        facetAttributes: facetAttrs,
        locale,
      },
    );
    if (!rows.length) return [];
    const attrByKey = new Map((facetAttrs ?? []).map((a) => [a.key, a]));
    const formatted = rows.map((row) => ({
      ...row,
      value: formatSpecValueForDisplay(row.value, attrByKey.get(row.specKey), locale),
    }));
    return groupSpecRowsByDisplayGroup(formatted, facetAttrs).map((g) => ({
      groupTitle: humanizeDisplayGroup(g.group, locale),
      rows: g.rows.map((r) => ({ key: r.specKey, label: r.label, value: r.value })),
    }));
  }, [groupedSpecs, facetAttrs, locale, product, modelDisplay]);

  const hasSpecs = specSections.some((s) => s.rows.length > 0);

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
          <ImageGallery images={product.images || []} model3d={product.model3d} alt={product.name} />
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
            {product.oldPrice ? (
              <span className={styles.oldPrice}>{formatMoney(product.oldPrice)} IQD</span>
            ) : null}
          </div>

          <div className={styles.badgeRow}>
            {product.inStock ? (
              <span className={`${styles.badge} ${styles.badgeStock}`}>{t("inStock")}</span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeOut}`}>{t("outOfStock")}</span>
            )}
            {product.isNew ? <span className={`${styles.badge} ${styles.badgeNew}`}>{t("newArrival")}</span> : null}
            {product.featured ? (
              <span className={`${styles.badge} ${styles.badgeFeatured}`}>{t("featured")}</span>
            ) : null}
          </div>

          <p className={styles.desc}>{product.desc}</p>

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

      {hasSpecs ? (
        <section className={styles.specificationsCard} aria-labelledby="pdp-specifications-title">
          <h2 id="pdp-specifications-title" className={styles.specificationsTitle}>
            {t("specificationsTitle")}
          </h2>
          <div className={styles.attributes}>
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
            {specSections.map(({ groupTitle, rows }) => (
              <div key={groupTitle}>
                <p className={styles.specSectionTitle}>{groupTitle}</p>
                {rows.map((row) => (
                  <div key={row.key} className={styles.attrRow}>
                    <span className={styles.attrLabel}>{row.label}</span>
                    <span className={styles.attrValue}>{row.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {relatedProducts.length > 0 ? (
        <MotionReveal direction="up" delay={0.05}>
          <section className={styles.relatedSection}>
            <h2 className={styles.relatedTitle}>{t("relatedTitle")}</h2>
            <div className={styles.relatedGrid}>
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} categories={categories} delay={i * 50} />
              ))}
            </div>
          </section>
        </MotionReveal>
      ) : null}
    </div>
  );
}
