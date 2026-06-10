"use client";

import styles from "./about.module.css";
import { Shield, Headset, Truck } from "lucide-react";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { MotionStagger, MotionStaggerItem } from "@/components/motion/MotionStagger";
import { motion } from "framer-motion";
import { springSnappy } from "@/lib/motion";
import { Seo } from "@/components/seo/Seo";
import { useTranslations } from "@/i18n/hooks";

export default function AboutPage() {
  const t = useTranslations("content.about");
  const tSeo = useTranslations("Seo");
  return (
    <div className={styles.wrapper}>
      <Seo title={tSeo("aboutTitle")} description={tSeo("aboutDesc")} />
      <MotionReveal direction="scale" amount={16}>
        <div className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <h1 className={styles.heroTitle}>{t("heroTitle")}</h1>
            <p className={styles.heroDesc}>{t("heroLead")}</p>
          </div>
        </div>
      </MotionReveal>

      <MotionStagger className={`container ${styles.grid}`}>
        <MotionStaggerItem>
          <motion.div className={styles.card} whileHover={{ y: -6 }} transition={springSnappy}>
            <div className={styles.cardIcon}>
              <Shield size={32} />
            </div>
            <h3 className={styles.cardTitle}>{t("cardGenuineTitle")}</h3>
            <p className={styles.cardDesc}>{t("cardGenuineBody")}</p>
          </motion.div>
        </MotionStaggerItem>
        <MotionStaggerItem>
          <motion.div className={styles.card} whileHover={{ y: -6 }} transition={springSnappy}>
            <div className={styles.cardIcon}>
              <Headset size={32} />
            </div>
            <h3 className={styles.cardTitle}>{t("cardSupportTitle")}</h3>
            <p className={styles.cardDesc}>{t("cardSupportBody")}</p>
          </motion.div>
        </MotionStaggerItem>
        <MotionStaggerItem>
          <motion.div className={styles.card} whileHover={{ y: -6 }} transition={springSnappy}>
            <div className={styles.cardIcon}>
              <Truck size={32} />
            </div>
            <h3 className={styles.cardTitle}>{t("cardDeliveryTitle")}</h3>
            <p className={styles.cardDesc}>{t("cardDeliveryBody")}</p>
          </motion.div>
        </MotionStaggerItem>
      </MotionStagger>

      <MotionReveal direction="left" delay={0.06} className={`container ${styles.storySection}`}>
        <img
          src="https://images.unsplash.com/photo-1542393545-10f5cde2c810?q=80&w=1000"
          alt={t("storyImageAlt")}
          className={styles.storyImage}
          loading="lazy"
        />
        <div className={styles.storyContent}>
          <h2>{t("storyTitle")}</h2>
          <p>{t("storyP1")}</p>
          <p>{t("storyP2")}</p>
          <p>{t("storyP3")}</p>
        </div>
      </MotionReveal>
    </div>
  );
}
