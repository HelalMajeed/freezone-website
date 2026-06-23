"use client";

import { ChevronRight, Zap } from "lucide-react";
import { Link } from "@/navigation";
import { useTranslations } from "@/i18n/hooks";
import { ProductCard } from "@/components/ui/ProductCard";
import { ProductCarouselRow, useCarouselDragGuard } from "@/components/ui/ProductCarouselRow";
import { padCountdown, useMidnightCountdown } from "@/hooks/useMidnightCountdown";
import type { Product } from "@/lib/data";
import sliderStyles from "@/components/ui/ProductSlider.module.css";
import styles from "./HomeFlashDealsRail.module.css";

type HomeFlashDealsRailProps = {
  products?: Product[];
  title?: string;
  link?: string;
};

function FlashSlide({ product, index }: { product: Product; index: number }) {
  const blockClickIfDragged = useCarouselDragGuard();
  return (
    <div className={sliderStyles.slide} onClickCapture={blockClickIfDragged}>
      <ProductCard product={product} delay={index * 50} />
    </div>
  );
}

/** On-sale products with countdown to midnight — master prompt §8.2 Section 4. */
export function HomeFlashDealsRail({ products, title, link }: HomeFlashDealsRailProps = {}) {
  const t = useTranslations("Home");
  const { hours, minutes, seconds } = useMidnightCountdown();

  const list = products ?? [];

  if (list.length === 0) return null;

  const timer = `${padCountdown(hours)}:${padCountdown(minutes)}:${padCountdown(seconds)}`;
  const viewAllHref = link ?? "/products?onSale=true";
  const scrollStep = typeof window !== "undefined" && window.innerWidth < 768 ? 260 : 320;

  return (
    <section className={styles.wrap} aria-labelledby="home-flash-deals-title">
      <div className={sliderStyles.shell}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <Zap size={22} aria-hidden style={{ color: "var(--color-brand-600, #dc2626)", flexShrink: 0 }} />
            <h2 id="home-flash-deals-title" className={styles.title}>
              {title ?? t("flashDeals")}
            </h2>
          </div>
          <div className={styles.headerEnd}>
            <div className={styles.timer} role="timer" aria-live="polite">
              <span className={styles.timerLabel}>{t("flashEndsIn")}</span>
              <span>{timer}</span>
            </div>
            <Link
              href={viewAllHref}
              className={`${sliderStyles.viewAllBtn} ${sliderStyles.viewAllBtnTeal}`}
            >
              {t("viewAll")} <ChevronRight size={16} />
            </Link>
          </div>
        </div>
        <ProductCarouselRow itemCount={list.length} scrollStep={scrollStep}>
          {list.map((product, idx) => (
            <FlashSlide key={product.id} product={product} index={idx} />
          ))}
        </ProductCarouselRow>
      </div>
    </section>
  );
}
