"use client";

import { Link } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { Seo } from "@/components/seo/Seo";
import { POLICY_DOCS, type PolicyKind } from "@/lib/policy-content";
import styles from "./policies.module.css";

export function PolicyPage({ kind }: { kind: PolicyKind }) {
  const locale = useLocale();
  const t = useTranslations("Policies");
  const tSeo = useTranslations("Seo");
  const doc = POLICY_DOCS[kind];
  const ar = locale === "ar";
  /** Original four docs map to `Seo.*` keys; newer docs carry bilingual SEO copy inline. */
  const seoTitle = doc.seoKey ? tSeo(`${doc.seoKey}Title`) : ar ? doc.titleAr : doc.titleEn;
  const seoDesc = doc.seoKey ? tSeo(`${doc.seoKey}Desc`) : (ar ? doc.seoDescAr : doc.seoDescEn) ?? "";

  return (
    <div className={styles.wrapper}>
      <Seo title={seoTitle} description={seoDesc} />

      <header className={styles.head}>
        <h1 className="fz-type-h1">{ar ? doc.titleAr : doc.titleEn}</h1>
        <p className={styles.updated}>
          {t("updatedLabel")}: {doc.updated}
        </p>
      </header>

      {doc.sections.map((section) => (
        <section key={section.titleEn} className={styles.section}>
          <h2 className={`fz-type-h3 ${styles.sectionTitle}`}>{ar ? section.titleAr : section.titleEn}</h2>
          {(ar ? section.bodyAr : section.bodyEn).map((p, i) => (
            <p key={i} className={styles.paragraph}>
              {p}
            </p>
          ))}
        </section>
      ))}

      <aside className={styles.contactCard}>
        <div>
          <h2 className={`fz-type-h4 ${styles.contactTitle}`}>{t("contactTitle")}</h2>
          <p className={`fz-type-small ${styles.contactBody}`}>{t("contactBody")}</p>
        </div>
        <Link href="/contact" className="btn-primary">
          {t("contactCta")}
        </Link>
      </aside>
    </div>
  );
}
