"use client";

import { useRef } from "react";
import { Link } from "@/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { Product } from "@/lib/data";
import styles from "./ProductSlider.module.css";
import { motion } from "framer-motion";
import { useTranslations } from "@/i18n/hooks";

interface ProductSliderProps {
  title: string;
  link: string;
  products: Product[];
  bgColor?: string;
  /** Overrides default "View All" label (e.g. from CMS) */
  viewAllLabel?: string;
  /** `teal` matches reference promo buttons */
  ctaVariant?: "gray" | "teal";
}

export function ProductSlider({
  title,
  link,
  products,
  bgColor = "var(--gray-50)",
  viewAllLabel,
  ctaVariant = "gray",
}: ProductSliderProps) {
  const t = useTranslations("Home");
  const scrollRef = useRef<HTMLDivElement>(null);

  const step = typeof window !== "undefined" && window.innerWidth < 768 ? 260 : 320;

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -step, behavior: "smooth" });
  };

  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: step, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <motion.section
      className={styles.section}
      style={{ backgroundColor: bgColor }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.shell}>
        
        {/* Header Block */}
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <h3 className={styles.title}>{title}</h3>
          </div>
          
          <div className={styles.actions}>
            <Link
              href={link}
              className={ctaVariant === "teal" ? `${styles.viewAllBtn} ${styles.viewAllBtnTeal}` : styles.viewAllBtn}
            >
              {viewAllLabel ?? t("viewAllProducts")} <ChevronRight size={16} />
            </Link>
            <div className={styles.navButtons}>
              <motion.button type="button" className={styles.navBtn} onClick={scrollLeft} aria-label="Scroll Left" whileTap={{ scale: 0.92 }}>
                <ChevronLeft size={20} />
              </motion.button>
              <motion.button type="button" className={styles.navBtn} onClick={scrollRight} aria-label="Scroll Right" whileTap={{ scale: 0.92 }}>
                <ChevronRight size={20} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Scroll Track */}
        <div className={styles.trackWrapper}>
          <div className={styles.track} ref={scrollRef}>
            {products.map((product, idx) => (
              <div key={product.id} className={styles.slide}>
                {/* Reusing our previously perfected ProductCard */}
                <ProductCard product={product} delay={idx * 50} />
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </motion.section>
  );
}
