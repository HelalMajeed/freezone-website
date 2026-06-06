"use client";

import styles from "./about.module.css";
import { Shield, Zap, Award } from "lucide-react";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { MotionStagger, MotionStaggerItem } from "@/components/motion/MotionStagger";
import { motion } from "framer-motion";
import { springSnappy } from "@/lib/motion";
import { Seo } from "@/components/seo/Seo";
import { useTranslations } from "@/i18n/hooks";

export default function AboutPage() {
  const tSeo = useTranslations("Seo");
  return (
    <div className={styles.wrapper}>
      <Seo title={tSeo("aboutTitle")} description={tSeo("aboutDesc")} />
      <MotionReveal direction="scale" amount={16}>
        <div className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <h1 className={styles.heroTitle}>About us</h1>
            <p className={styles.heroDesc}>
              Iraq&apos;s leading destination for premium PC components, high-end gaming laptops, and enterprise security
              solutions.
            </p>
          </div>
        </div>
      </MotionReveal>

      <MotionStagger className={`container ${styles.grid}`}>
        <MotionStaggerItem>
          <motion.div className={styles.card} whileHover={{ y: -6 }} transition={springSnappy}>
            <div className={styles.cardIcon}>
              <Shield size={32} />
            </div>
            <h3 className={styles.cardTitle}>100% Genuine</h3>
            <p className={styles.cardDesc}>
              We are proud to provide original, high-quality tech components covering top global brands directly to the Iraqi
              market.
            </p>
          </motion.div>
        </MotionStaggerItem>
        <MotionStaggerItem>
          <motion.div className={styles.card} whileHover={{ y: -6 }} transition={springSnappy}>
            <div className={styles.cardIcon}>
              <Zap size={32} />
            </div>
            <h3 className={styles.cardTitle}>Expert Support</h3>
            <p className={styles.cardDesc}>
              Our technical team is highly trained to provide you with the best PC building advice and after-sales warranty
              support.
            </p>
          </motion.div>
        </MotionStaggerItem>
        <MotionStaggerItem>
          <motion.div className={styles.card} whileHover={{ y: -6 }} transition={springSnappy}>
            <div className={styles.cardIcon}>
              <Award size={32} />
            </div>
            <h3 className={styles.cardTitle}>Nationwide Reach</h3>
            <p className={styles.cardDesc}>
              Fast and secure delivery to all provinces across Iraq safely within 24-48 hours with cash on delivery.
            </p>
          </motion.div>
        </MotionStaggerItem>
      </MotionStagger>

      <MotionReveal direction="left" delay={0.06} className={`container ${styles.storySection}`}>
        <img src="https://images.unsplash.com/photo-1542393545-10f5cde2c810?q=80&w=1000" alt="Our store" className={styles.storyImage} />
        <div className={styles.storyContent}>
          <h2>Our Story</h2>
          <p>
            We began with a simple idea: Iraqi builders and gamers deserve access to the same premium components found in
            major markets—backed by honest advice and reliable warranty.
          </p>
          <p>
            Today we serve enthusiasts, professionals, and businesses across the country from our showroom and online store.
          </p>
        </div>
      </MotionReveal>
    </div>
  );
}
