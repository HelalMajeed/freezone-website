"use client";

import { Link } from "@/navigation";
import styles from "./CategoryGrid.module.css";
import { ArrowRight } from "lucide-react";
import { useStorefront } from "@/components/providers/StorefrontProvider";

const FALLBACK_IMAGES: string[] = [
  "https://images.unsplash.com/photo-1593640495253-23196b27a87f?q=80&w=800",
  "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=800",
  "https://images.unsplash.com/photo-1527443195645-1133f7f28990?q=80&w=800",
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800",
];

const CHIPS = ["Best Sellers", "New Stock", "Top Picks", "Enterprise"];

export function CategoryGrid() {
  const { catalog } = useStorefront();
  /** Top-level categories only — child categories live on their parent's landing page. */
  const cats = catalog.categories.filter((c) => !c.parent).slice(0, 5);
  if (cats.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowLine} />
            Our Categories
            <span className={styles.eyebrowLine} />
          </div>
          <h2 className={styles.title}>Shop By Category</h2>
          <p className={styles.subtitle}>Everything you need to build, upgrade & power your setup</p>
        </div>

        <div className={styles.grid}>
          {cats.map((cat, i) => (
            <div key={cat.id}>
              <Link href={`/products?cat=${encodeURIComponent(cat.id)}`} className={styles.card} prefetch>
                <img
                  src={(cat.img && cat.img.trim()) ? cat.img.trim() : FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]}
                  alt=""
                  className={styles.cardImage}
                />
                <div
                  className={styles.gradient}
                  style={{
                    background: `linear-gradient(135deg, ${cat.color}40 0%, rgba(15,23,42,0.92) 100%)`,
                  }}
                />
                <div className={styles.content}>
                  <span className={styles.cardChip}>{CHIPS[i % CHIPS.length]}</span>
                  <h3 className={styles.cardTitle}>{cat.name}</h3>
                  <span className={styles.cardLink}>
                    Explore <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
