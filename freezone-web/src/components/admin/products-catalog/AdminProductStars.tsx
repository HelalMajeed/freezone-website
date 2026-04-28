"use client";

import { Star } from "lucide-react";
import styles from "./admin-product-stars.module.css";

type Props = { rating: number; reviews?: number };

/** Renders 5 stars from rounded half-step rating (e.g. 4.3 → 4, 4.6 → 4.5 as 5 filled at 5). */
export function AdminProductStars({ rating, reviews }: Props) {
  const stepped = Math.round(rating * 2) / 2;
  const full = Math.floor(stepped);
  const half = stepped - full >= 0.5 && full < 5;

  return (
    <div className={styles.wrap} aria-label={`التقييم ${rating.toFixed(1)} من 5`}>
      <div className={styles.stars} role="img">
        {Array.from({ length: 5 }, (_, i) => {
          if (i < full) {
            return <Star key={i} className={styles.fill} size={14} fill="currentColor" strokeWidth={0} aria-hidden />;
          }
          if (i === full && half) {
            return (
              <span key={i} className={styles.halfWrap} aria-hidden>
                <Star className={styles.muted} size={14} strokeWidth={1.6} />
                <Star className={`${styles.fill} ${styles.half}`} size={14} fill="currentColor" strokeWidth={0} />
              </span>
            );
          }
          return <Star key={i} className={styles.muted} size={14} strokeWidth={1.6} aria-hidden />;
        })}
      </div>
      {reviews != null && reviews > 0 ? <span className={styles.count}>({reviews})</span> : null}
    </div>
  );
}
