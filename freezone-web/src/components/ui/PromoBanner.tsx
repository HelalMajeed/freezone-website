"use client";

import { Link } from "@/navigation";
import styles from "./PromoBanner.module.css";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { springSnappy } from "@/lib/motion";

interface PromoBannerProps {
  title: string;
  link: string;
  image: string;
  style?: React.CSSProperties;
}

export function PromoBanner({ title, link, image, style }: PromoBannerProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={styles.motionWrap}
      style={style}
      whileHover={reduce ? undefined : { y: -5 }}
      whileTap={reduce ? undefined : { scale: 0.995 }}
      transition={springSnappy}
    >
      <Link href={link} className={styles.bannerWrapper}>
        <div className={styles.content}>
          <h2 className={styles.title}>{title}</h2>
          <span className={styles.ctaBtn}>
            SHOP NOW <ArrowRight size={16} className={styles.arrow} />
          </span>
        </div>
        <div className={styles.imageOverlay} />
        <img src={image} alt={title} className={styles.bgImage} />
      </Link>
    </motion.div>
  );
}
