import { Link, useParams } from "react-router-dom";
import { useTranslations } from "@/i18n/hooks";
import { Seo } from "@/components/seo/Seo";
import styles from "./notFound.module.css";

/**
 * Locale-aware 404. Replaces the previous silent `<Navigate to="/en">` catch-all
 * so a mistyped URL gives the user an actionable page instead of a confusing
 * bounce to the homepage.
 */
export default function NotFoundPage() {
  const { locale } = useParams<{ locale: string }>();
  const lc = locale === "ar" ? "ar" : "en";
  const t = useTranslations("NotFound");
  const tSeo = useTranslations("Seo");
  const home = `/${lc}`;
  const products = `/${lc}/products`;

  return (
    <div className={styles.wrapper}>
      <Seo title={tSeo("notFoundTitle")} noindex />
      <div className={styles.code} aria-hidden>
        404
      </div>
      <h1 className={`fz-type-h2 ${styles.title}`}>{t("title")}</h1>
      <p className={styles.body}>{t("body")}</p>
      <div className={styles.actions}>
        <Link to={home} className={styles.primaryLink}>
          {t("home")}
        </Link>
        <Link to={products} className={styles.secondaryLink}>
          {t("browse")}
        </Link>
      </div>
    </div>
  );
}
