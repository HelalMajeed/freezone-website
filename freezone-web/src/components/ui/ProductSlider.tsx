"use client";

import { Link } from "@/navigation";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { Product } from "@/lib/data";
import styles from "./ProductSlider.module.css";
import { motion } from "framer-motion";
import { useTranslations } from "@/i18n/hooks";
import { ProductCarouselRow, useCarouselDragGuard } from "./ProductCarouselRow";

interface ProductSliderProps {
  title: string;
  link: string;
  products: Product[];
  bgColor?: string;
  /** Overrides default "View All" label (e.g. from CMS) */
  viewAllLabel?: string;
  /** `teal` matches reference promo buttons */
  ctaVariant?: "gray" | "teal";
  /** Compact padding for homepage hot-items row */
  compact?: boolean;
}

function ProductSlide({ product, index }: { product: Product; index: number }) {
  const blockClickIfDragged = useCarouselDragGuard();
  return (
    <div className={styles.slide} onClickCapture={blockClickIfDragged}>
      <ProductCard product={product} delay={index * 50} />
    </div>
  );
}

export function ProductSlider({
  title,
  link,
  products,
  bgColor = "var(--color-neutral-50)",
  viewAllLabel,
  ctaVariant = "gray",
  compact = false,
}: ProductSliderProps) {
  const t = useTranslations("Home");

  if (products.length === 0) return null;

  const scrollStep = typeof window !== "undefined" && window.innerWidth < 768 ? 260 : 320;

  return (
    <motion.section
      className={compact ? `${styles.section} ${styles.sectionCompact}` : styles.section}
      style={{ backgroundColor: bgColor }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.shell}>
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
          </div>
        </div>

        <ProductCarouselRow itemCount={products.length} scrollStep={scrollStep}>
          {products.map((product, idx) => (
            <ProductSlide key={product.id} product={product} index={idx} />
          ))}
        </ProductCarouselRow>
      </div>
    </motion.section>
  );
}
