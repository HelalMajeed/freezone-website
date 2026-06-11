"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { Seo } from "@/components/seo/Seo";
import { FAQ_ITEMS } from "@/lib/faq-content";
import styles from "./faq.module.css";

/** /:locale/faq — bilingual FAQ accordion (ordering, COD, delivery, warranty, returns…). */
export default function FaqPage() {
  const locale = useLocale();
  const t = useTranslations("content.faq");
  const tPolicies = useTranslations("Policies");
  const ar = locale === "ar";
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={styles.wrapper}>
      <Seo title={t("seoTitle")} description={t("seoDesc")} />

      <header className={styles.head}>
        <h1 className="fz-type-h1">{t("title")}</h1>
        <p className={styles.intro}>{t("intro")}</p>
      </header>

      <div className={styles.list}>
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;
          const panelId = `faq-panel-${item.id}`;
          const buttonId = `faq-q-${item.id}`;
          return (
            <div key={item.id} className={`${styles.item} ${isOpen ? styles.itemOpen : ""}`}>
              <button
                type="button"
                id={buttonId}
                className={styles.questionBtn}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
              >
                <span>{ar ? item.qAr : item.qEn}</span>
                <ChevronDown size={18} className={styles.chev} aria-hidden />
              </button>
              <div id={panelId} role="region" aria-labelledby={buttonId} className={styles.answerWrap}>
                <div className={styles.answerInner}>
                  <p className={styles.answer}>{ar ? item.aAr : item.aEn}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <aside className={styles.contactCard}>
        <div>
          <h2 className={`fz-type-h4 ${styles.contactTitle}`}>{tPolicies("contactTitle")}</h2>
          <p className={`fz-type-small ${styles.contactBody}`}>{tPolicies("contactBody")}</p>
        </div>
        <Link href="/contact" className="btn-primary">
          {tPolicies("contactCta")}
        </Link>
      </aside>
    </div>
  );
}
