"use client";

import { Link } from "@/navigation";
import styles from "./GamingCategoriesGrid.module.css";
import { useStorefront } from "@/components/providers/StorefrontProvider";

/** Stock photos when category has no custom asset — rotated by index */
const STOCK_BG: string[] = [
  "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=600",
  "https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=600",
  "https://images.unsplash.com/photo-1612282130134-49784d98ac61?q=80&w=600",
  "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=600",
];

export function GamingCategoriesGrid() {
  const { catalog } = useStorefront();
  /** Top-level categories only — child categories live on their parent's landing page. */
  const cats = catalog.categories.filter((c) => !c.parent).slice(0, 5);

  if (cats.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          {cats.map((cat, i) => (
            <div key={cat.id} className={styles.cardWrapper}>
              <Link href={`/products?cat=${encodeURIComponent(cat.id)}`} className={styles.card}>
                <div
                  className={styles.bgImage}
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${cat.color}40 0%, #0f172a 100%), url(${JSON.stringify(
                      (cat.img && cat.img.trim()) ? cat.img.trim() : STOCK_BG[i % STOCK_BG.length],
                    )})`,
                  }}
                />
                <div className={styles.overlay} />
                <div className={`${styles.corner} ${styles.topLeft}`} />
                <div className={`${styles.corner} ${styles.topRight}`} />
                <div className={`${styles.corner} ${styles.bottomLeft}`} />
                <div className={`${styles.corner} ${styles.bottomRight}`} />
                <div className={styles.content}>
                  <h4 className={styles.titleEn}>{cat.name.toUpperCase()}</h4>
                </div>
              </Link>
              <div className={styles.bottomLabel}>{cat.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
