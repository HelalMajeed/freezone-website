"use client";

import { Link } from "@/navigation";
import styles from "./CategoryIconStrip.module.css";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { inferCategoryIconKey } from "@/lib/category-icon-auto";
import { LucideByName } from "@/lib/lucide-icon-map";
import type { PublicSpotlightItem } from "@/lib/layout-cms";

function iconKeyForSpot(cat: PublicSpotlightItem): string {
  if (cat.iconKey?.trim()) return cat.iconKey.trim();
  const slug = decodeURIComponent(cat.href.match(/[?&]cat=([^&]+)/)?.[1] ?? "");
  return inferCategoryIconKey(slug, cat.label, cat.label);
}

const containerV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.06 } },
};

const itemV = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease: EASE_OUT } },
};

const itemStatic = { hidden: { opacity: 1, y: 0, scale: 1 }, show: { opacity: 1, y: 0, scale: 1 } };

export function CategoryIconStrip({ previewSpots }: { previewSpots?: PublicSpotlightItem[] }) {
  const { home } = useStorefront();
  const items = previewSpots ?? home.spotlights;
  const reduce = useReducedMotion();
  const iv = reduce ? itemStatic : itemV;
  const cv = reduce ? { hidden: {}, show: {} } : containerV;

  if (items.length === 0) return null;

  return (
    <motion.div
      className={styles.stripWrapper}
      variants={cv}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-24px" }}
    >
      <div className={`container ${styles.stripInner}`}>
        {items.map((cat) => (
          <motion.div
            key={cat.id}
            className={styles.itemOuter}
            variants={iv}
            whileHover={reduce ? undefined : { y: -3 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            <Link href={cat.href} className={styles.item}>
              <div className={styles.iconCircle} aria-hidden>
                <LucideByName name={iconKeyForSpot(cat)} size={26} strokeWidth={1.5} />
              </div>
              <span className={styles.label}>{cat.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
