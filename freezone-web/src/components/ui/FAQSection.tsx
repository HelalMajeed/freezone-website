"use client";

import { useState } from "react";
import styles from "./FAQSection.module.css";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { MotionReveal } from "@/components/motion/MotionReveal";

type FAQItem = { q: string; a: string };

export function FAQSection({
  mode = "i18n",
  items: customItems,
}: {
  mode?: "i18n" | "custom";
  items?: FAQItem[];
}) {
  const t = useTranslations("FAQ");
  const locale = useLocale();
  const { home } = useStorefront();
  const pc = home.pageCopy;
  const ar = locale === "ar";
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const fromCms: FAQItem[] | null =
    pc?.faqItems?.length && mode !== "custom"
      ? pc.faqItems
          .filter((x) => Boolean(x.qEn?.trim() || x.qAr?.trim() || x.aEn?.trim() || x.aAr?.trim()))
          .map((x) => ({
            q: (ar ? x.qAr : x.qEn) || (ar ? x.qEn : x.qAr) || "",
            a: (ar ? x.aAr : x.aEn) || (ar ? x.aEn : x.aAr) || "",
          }))
          .filter((x) => x.q.trim() && x.a.trim())
      : null;

  const FAQS: FAQItem[] =
    mode === "custom" && customItems?.length
      ? customItems
      : fromCms?.length
        ? fromCms
        : [
            { q: t("q1"), a: t("a1") },
            { q: t("q2"), a: t("a2") },
            { q: t("q3"), a: t("a3") },
            { q: t("q4"), a: t("a4") },
            { q: t("q5"), a: t("a5") },
          ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className={styles.section}>
      <div className={`container ${styles.layout}`}>
        
        {/* Left Side: Accordion */}
        <div className={styles.accordionBox}>
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={idx}
                className={`${styles.faqItem} ${isOpen ? styles.open : ""}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-24px" }}
                transition={{ delay: idx * 0.05, duration: 0.42, ease: EASE_OUT }}
              >
                <button type="button" className={styles.questionBtn} onClick={() => toggleFAQ(idx)}>
                  <div className={styles.qText}>
                    <span className={styles.q}>{faq.q}</span>
                  </div>
                  <div className={styles.iconBox}>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>
                <div className={styles.answerWrapper} style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                  <div className={styles.answerInner}>
                    <p className={styles.a}>{faq.a}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right Side: Title Block */}
        <MotionReveal direction="left" delay={0.08} className={styles.titleBlock}>
          {(() => {
            const titleOv = (ar ? pc?.faqTitleAr?.trim() : pc?.faqTitleEn?.trim()) || (ar ? pc?.faqTitleEn?.trim() : pc?.faqTitleAr?.trim());
            const descOv = (ar ? pc?.faqDescAr?.trim() : pc?.faqDescEn?.trim()) || (ar ? pc?.faqDescEn?.trim() : pc?.faqDescAr?.trim());
            const btnOv = (ar ? pc?.faqContactBtnAr?.trim() : pc?.faqContactBtnEn?.trim()) || (ar ? pc?.faqContactBtnEn?.trim() : pc?.faqContactBtnAr?.trim());
            return (
              <>
                <h2
                  className={styles.title}
                  dangerouslySetInnerHTML={{
                    __html: titleOv
                      ? titleOv.includes("<")
                        ? titleOv
                        : titleOv.replace(/\n/g, "<br/>")
                      : String(t("title")),
                  }}
                />
                <p className={styles.description}>{descOv || t("description")}</p>
                <motion.button
                  type="button"
                  className={`btn-primary ${styles.contactBtn}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {btnOv || t("contactSupport")}
                </motion.button>
              </>
            );
          })()}
        </MotionReveal>

      </div>
    </section>
  );
}
