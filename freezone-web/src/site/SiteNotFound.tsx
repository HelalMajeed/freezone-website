import { Link as RouterLink } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { Seo } from "@/components/seo/Seo";
import styles from "./site.module.css";

/** Locale-aware "page not found" in the storefront shell (unknown address or product). */
export function SiteNotFound() {
  const locale = useLocale();
  const t = useTranslations("NotFound");
  const tSeo = useTranslations("Seo");

  return (
    <section className={`${styles.wrap} ${styles.missing}`}>
      <Seo title={tSeo("notFoundTitle")} noindex />
      <div className={styles.missingCode} aria-hidden="true" dir="ltr">
        404
      </div>
      <h1 className={styles.h1}>{t("title")}</h1>
      <p className={styles.emptyText}>{t("body")}</p>
      <div className={styles.missingActions}>
        <RouterLink to={`/${locale}`} className={styles.darkBtn}>
          {t("home")}
        </RouterLink>
        <RouterLink to={`/${locale}/products`} className={styles.pillBtn}>
          {t("browse")}
        </RouterLink>
      </div>
    </section>
  );
}

export default SiteNotFound;
