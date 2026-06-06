"use client";

import { useMemo } from "react";
import { Heart } from "lucide-react";
import { Link } from "@/navigation";
import { useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { useWishlist } from "@/lib/wishlist-store";
import { ProductCard } from "@/components/ui/ProductCard";
import { Seo } from "@/components/seo/Seo";
import styles from "./wishlist.module.css";

export default function WishlistPage() {
  const t = useTranslations("Wishlist");
  const tSeo = useTranslations("Seo");
  const { catalog } = useStorefront();
  const ids = useWishlist((s) => s.ids);
  const clear = useWishlist((s) => s.clear);

  const products = useMemo(() => {
    const byId = new Map(catalog.products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [ids, catalog.products]);

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

      {products.length === 0 ? (
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
