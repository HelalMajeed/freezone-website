import { Link as RouterLink } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { Seo } from "@/components/seo/Seo";
import { useSiteCart } from "./cart";
import { useCatalog } from "./catalog";
import { HeartIcon } from "./icons";
import { useSitePrefs } from "./prefs";
import { GhostCard, ProductCard } from "./ProductCard";
import { toast } from "./ui";
import styles from "./site.module.css";

/** The products this visitor marked with the heart, kept in this browser. */
export default function FavoritesPage() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const { data: catalog } = useCatalog();
  const ids = useSitePrefs((s) => s.favorites);
  const clearFavorites = useSitePrefs((s) => s.clearFavorites);
  const add = useSiteCart((s) => s.add);
  const openCart = useSiteCart((s) => s.setOpen);

  /** Only products the catalogue still has. */
  const products = catalog ? ids.flatMap((id) => catalog.byId.get(id) ?? []) : [];
  const buyable = products.filter((p) => p.flag !== "out");

  return (
    <section className={styles.page}>
      <Seo title={t("favorites")} noindex />
      <div className={`${styles.wrap} ${styles.pageStack}`}>
        <nav className={styles.crumbs} aria-label={t("breadcrumb")}>
          <RouterLink to={`/${locale}`}>{t("home")}</RouterLink>
          <span aria-hidden="true">/</span>
          <span className={styles.crumbNow} aria-current="page">
            {t("favorites")}
          </span>
        </nav>

        <div className={styles.listHead}>
          <div className={styles.listTitleBox}>
            <h1 className={styles.h1}>{t("favorites")}</h1>
            {products.length > 0 ? <span className={styles.count}>{t("itemsCount", { count: products.length })}</span> : null}
          </div>
          {products.length > 0 ? (
            <div className={styles.doneActions}>
              {buyable.length > 0 ? (
                <button
                  type="button"
                  className={styles.darkBtn}
                  onClick={() => {
                    for (const p of buyable) add(p.id);
                    toast(t("toastAddedCount", { count: buyable.length }), {
                      label: t("toastViewCart"),
                      run: () => openCart(true),
                    });
                  }}
                >
                  {t("favAddAll")}
                </button>
              ) : null}
              <button type="button" className={styles.clearBtn} onClick={clearFavorites}>
                {t("favClear")}
              </button>
            </div>
          ) : null}
        </div>

        {!catalog ? (
          <div className={styles.grid} aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <GhostCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <HeartIcon size={28} />
            </span>
            <span className={styles.emptyTitle}>{t("favEmptyTitle")}</span>
            <span className={styles.emptyText}>{t("favEmptyText")}</span>
            <RouterLink to={`/${locale}/products`} className={styles.darkBtn}>
              {t("showAll")}
            </RouterLink>
          </div>
        ) : (
          <div className={styles.grid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} catalog={catalog} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
