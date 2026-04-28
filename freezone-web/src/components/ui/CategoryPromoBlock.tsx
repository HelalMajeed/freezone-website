"use client";

import { Link } from "@/navigation";
import styles from "./CategoryPromoBlock.module.css";
import { ArrowRight, Cpu } from "lucide-react";

export interface CategoryItem {
  id: string;
  label: string;
  count: number;
  image: string;
  link: string;
}

interface CategoryPromoBlockProps {
  sectionTitle?: string;
  viewAllLink?: string;
  bannerImage: string;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerLink: string;
  categories: CategoryItem[];
  bottomCta?: {
    text: string;
    link: string;
  };
}

export function CategoryPromoBlock({
  sectionTitle,
  viewAllLink,
  bannerImage,
  bannerTitle,
  bannerSubtitle,
  bannerLink,
  categories,
  bottomCta
}: CategoryPromoBlockProps) {
  return (
    <section className={styles.section}>
      <div className="container">
        
        {/* Optional Section Header */}
        {sectionTitle && (
          <div className={styles.sectionHeader}>
            <div className={styles.titleBlock}>
              <h3 className={styles.title}>{sectionTitle}</h3>
            </div>
            {viewAllLink && (
              <Link href={viewAllLink} className={styles.viewAllBtn}>
                View All <ArrowRight size={16} />
              </Link>
            )}
          </div>
        )}

        {/* Main Content Box */}
        <div className={styles.mainBox}>
          
          {/* Left Side: Category Grid */}
          <div className={styles.gridBox}>
            {categories.map((cat) => (
              <Link key={cat.id} href={cat.link} className={styles.catItem}>
                <div className={styles.imgWrapper}>
                  <img src={cat.image} alt={cat.label} className={styles.catImg} />
                </div>
                <div className={styles.catText}>
                  <span className={styles.catName}>{cat.label}</span>
                  <span className={styles.catCount}>{cat.count} items</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Right Side: Promo Banner */}
          <div className={styles.bannerBox}>
            <img src={bannerImage} alt={bannerTitle} className={styles.bannerImg} />
            <div className={styles.bannerOverlay}>
              <h3 className={styles.bannerTitle}>{bannerTitle}</h3>
              <p className={styles.bannerSubtitle}>{bannerSubtitle}</p>
              <Link href={bannerLink} className={styles.shopNowBtn}>
                Shop Now
              </Link>
            </div>
          </div>

        </div>

        {/* Optional Bottom CTA (e.g., PC Builder) */}
        {bottomCta && (
          <Link href={bottomCta.link} className={styles.bottomCta}>
            <Cpu size={24} />
            <span>{bottomCta.text}</span>
            <ArrowRight size={20} style={{ marginLeft: "auto" }} />
          </Link>
        )}
      </div>
    </section>
  );
}
