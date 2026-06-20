"use client";

import { useMemo } from "react";
import { Link } from "@/navigation";
import styles from "./PromoMegaBlocks.module.css";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { motion, useReducedMotion } from "framer-motion";
import { resolvePromoMegaCards } from "@/lib/home-promo-mega";

/** Smooth ease-out for scroll entrances (matches premium UI motion) */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const BLOCK_IMAGES: string[] = [
  "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800",
  "https://images.unsplash.com/photo-1598327105666-5b89351cb31b?q=80&w=800",
  "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?q=80&w=800",
  "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=800",
];

export function PromoMegaBlocks(props: { payload?: Record<string, unknown> } = {}) {
  const { payload } = props;
  const tHome = useTranslations("Home");
  const { catalog } = useStorefront();
  const reduceMotion = useReducedMotion();
  const cards = useMemo(
    () => resolvePromoMegaCards(catalog.categories, payload, BLOCK_IMAGES),
    [catalog.categories, payload],
  );
  if (cards.length === 0) return null;

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.08,
        delayChildren: reduceMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: reduceMotion ? 1 : 0,
      y: reduceMotion ? 0 : 28,
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.52,
        ease: EASE_OUT,
      },
    },
  };

  return (
    <div className={styles.wrapper}>
      <motion.div
        className={styles.grid}
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2, margin: "0px 0px -56px 0px" }}
      >
        {cards.map(({ cat: block, imageUrl }, i) => (
          <motion.div key={`${block.id}-${i}`} className={styles.cardMotion} variants={itemVariants}>
            <Link
              href={`/products?cat=${encodeURIComponent(block.id)}`}
              className={styles.card}
              style={{
                background: `linear-gradient(135deg, ${(block.color?.trim() || "#111827")}40 0%, #111827 100%)`,
              }}
            >
              <div className={styles.textContent}>
                <h2 className={styles.title} style={{ color: "#ffffff" }}>
                  {block.name.toUpperCase()}
                </h2>
              </div>
              <div className={styles.imageWrapper}>
                <img src={imageUrl} alt="" className={styles.image} loading="lazy" decoding="async" />
              </div>

              <div className={styles.hoverOverlay}>
                <span className={styles.shopBtn}>
                  {tHome("shopNow")} <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
