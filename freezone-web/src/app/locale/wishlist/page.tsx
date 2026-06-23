"use client";

import { Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { useWishlist } from "@/lib/wishlist-store";
import { fetchProductsByIds } from "@/lib/catalog-products-api";
import { ProductCard } from "@/components/ui/ProductCard";
import { Seo } from "@/components/seo/Seo";
import styles from "./wishlist.module.css";

export default function WishlistPage() {
  const t = useTranslations("Wishlist");
  const tSeo = useTranslations("Seo");
  const locale = useLocale();
  const { catalog } = useStorefront();
  const ids = useWishlist((s) => s.ids);
  const clear = useWishlist((s) => s.clear);

  /** Saved ids → products fetched by id (never the full catalog). */
  const { data: products = [], isFetching } = useQuery({
    queryKey: ["wishlist-products", locale, ids],
    queryFn: () => fetchProductsByIds(ids, locale),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
  const loading = ids.length > 0 && isFetching && products.length === 0;

  return (
    <div className={`container ${styles.wrapper}`}>
      <Seo title={tSeo("wishlistTitle")} description={tSeo("wishlistDesc")} noindex />

      <header className={styles.head}>
        <div className={styles.titleRow}>
          <h1 className={`fz-type-h1 ${styles.title}`}>{t("title")}</h1>
          {products.length > 0 ? (
            <span className={styles.count}>{t("itemsCount", { count: products.length })}</span>
          ) : null}
        </div>
        {products.length > 0 ? (
          <button type="button" className={styles.clearBtn} onClick={clear}>
            {t("clear")}
          </button>
        ) : null}
      </header>

      {loading ? (
        <div className={styles.empty}>
          <p className={styles.emptyBody}>{locale === "ar" ? "جاري التحميل…" : "Loading…"}</p>
        </div>
      ) : products.length === 0 ? (
        <div className={styles.empty}>
          <Heart size={56} className={styles.emptyIcon} aria-hidden />
          <h2 className={`fz-type-h3 ${styles.emptyTitle}`}>{t("empty")}</h2>
          <p className={styles.emptyBody}>{t("emptySub")}</p>
          <Link href="/products" className="btn-primary">
            {t("browse")}
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} categories={catalog.categories} />
          ))}
        </div>
      )}
    </div>
  );
}
