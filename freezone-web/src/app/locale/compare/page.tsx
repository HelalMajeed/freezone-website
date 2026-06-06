"use client";

import { useMemo } from "react";
import { GitCompare, Star, X } from "lucide-react";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { useCompare } from "@/lib/compare-store";
import { Seo } from "@/components/seo/Seo";
import type { Product } from "@/lib/data";
import styles from "./compare.module.css";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

/** Union of spec keys across compared products, keeping each product's order. */
function unionSpecKeys(products: Product[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    for (const k of Object.keys(p.specs ?? {})) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  return keys;
}

export default function ComparePage() {
  const t = useTranslations("Compare");
  const tSeo = useTranslations("Seo");
  const locale = useLocale();
  const { catalog } = useStorefront();
  const ids = useCompare((s) => s.ids);
  const toggle = useCompare((s) => s.toggle);
  const clear = useCompare((s) => s.clear);

  const products = useMemo(() => {
    const byId = new Map(catalog.products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  }, [ids, catalog.products]);

  const specKeys = useMemo(() => unionSpecKeys(products), [products]);

  const specLabel = (key: string): string => {
    for (const p of products) {
      const cat = catalog.categories.find((c) => c.id === p.cat);
      const attr = cat?.facetAttributes?.find((a) => a.key === key);
      if (attr) return locale === "ar" ? attr.name_ar : attr.name_en;
    }
    return key.replace(/_/g, " ");
  };

  const categoryName = (p: Product): string => {
    const cat = catalog.categories.find((c) => c.id === p.cat);
    if (!cat) return p.cat;
    return locale === "ar" ? cat.nameAr || cat.name : cat.name;
  };

  return (
    <div className={`container ${styles.wrapper}`}>
      <Seo title={tSeo("compareTitle")} description={tSeo("compareDesc")} noindex />

      <header className={styles.head}>
        <div>
          <h1 className={`fz-type-h1 ${styles.title}`}>{t("title")}</h1>
          <p className={`fz-type-small ${styles.subtitle}`}>{t("subtitle")}</p>
        </div>
        {products.length > 0 ? (
          <button type="button" className={styles.clearBtn} onClick={clear}>
            {t("clear")}
          </button>
        ) : null}
      </header>

      {products.length === 0 ? (
        <div className={styles.empty}>
          <GitCompare size={56} className={styles.emptyIcon} aria-hidden />
          <h2 className={`fz-type-h3 ${styles.emptyTitle}`}>{t("empty")}</h2>
          <p className={styles.emptyBody}>{t("emptySub")}</p>
          <Link href="/products" className="btn-primary">
            {t("browse")}
          </Link>
        </div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <tbody>
              <tr>
                <th className={styles.rowLabel} scope="row" aria-hidden />
                {products.map((p) => (
                  <td key={p.id} className={styles.productCol}>
                    <div className={styles.productHead}>
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className={styles.productImage} loading="lazy" />
                      ) : (
                        <div className={styles.productImageFallback} aria-hidden>
                          {p.icon}
                        </div>
                      )}
                      <Link href={`/product/${p.id}`} className={styles.productName}>
                        {p.name}
                      </Link>
                      <button type="button" className={styles.removeBtn} onClick={() => toggle(p.id)}>
                        <X size={13} aria-hidden />
                        {t("remove")}
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <th className={styles.rowLabel} scope="row">
                  {t("price")}
                </th>
                {products.map((p) => (
                  <td key={p.id}>
                    <span className={styles.price}>{formatMoney(p.price)} IQD</span>
                    {p.oldPrice ? <span className={styles.oldPrice}>{formatMoney(p.oldPrice)}</span> : null}
                  </td>
                ))}
              </tr>
              <tr>
                <th className={styles.rowLabel} scope="row">
                  {t("brand")}
                </th>
                {products.map((p) => (
                  <td key={p.id} className={styles.specValue}>
                    {p.brand || "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <th className={styles.rowLabel} scope="row">
                  {t("category")}
                </th>
                {products.map((p) => (
                  <td key={p.id} className={styles.specValue}>
                    {categoryName(p)}
                  </td>
                ))}
              </tr>
              <tr>
                <th className={styles.rowLabel} scope="row">
                  {t("availability")}
                </th>
                {products.map((p) => (
                  <td key={p.id}>
                    <span className={p.inStock ? styles.stockIn : styles.stockOut}>
                      {p.inStock ? t("inStock") : t("outOfStock")}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <th className={styles.rowLabel} scope="row">
                  {t("rating")}
                </th>
                {products.map((p) => (
                  <td key={p.id} className={styles.specValue}>
                    <Star size={13} aria-hidden style={{ verticalAlign: "-2px" }} /> {p.rating.toFixed(1)} ({p.reviews})
                  </td>
                ))}
              </tr>
              {specKeys.map((key) => (
                <tr key={key}>
                  <th className={styles.rowLabel} scope="row">
                    {specLabel(key)}
                  </th>
                  {products.map((p) => (
                    <td key={p.id} className={styles.specValue}>
                      {p.specs?.[key] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th className={styles.rowLabel} scope="row" aria-hidden />
                {products.map((p) => (
                  <td key={p.id}>
                    <Link href={`/product/${p.id}`} className="btn-outline">
                      {t("viewProduct")}
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
