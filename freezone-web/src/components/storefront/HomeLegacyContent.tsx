"use client";

import styles from "@/app/locale/page.module.css";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { trustBarChromeStyle } from "@/lib/layout-cms";
import { LucideByName } from "@/lib/lucide-icon-map";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { HeroSlider } from "@/components/ui/HeroSlider";
import { HomeCatalogShowcase } from "@/components/storefront/HomeCatalogShowcase";

/** Homepage when no published CMS sections: hero + trust + أيقونات الأقسام + شبكة البطاقات. */
export function HomeLegacyContent() {
  const { home } = useStorefront();

  return (
    <div className={styles.home}>
      <HeroSlider />
      <MotionReveal>
        <div className={styles.featuresBar} style={trustBarChromeStyle(home)}>
          <div
            className={styles.featuresBarBg}
            style={{ background: home.trustBarBackground }}
            aria-hidden
          />
          <div className={`container ${styles.featuresGrid}`}>
            {home.trustBar.map((item) => (
              <div key={item.id} className={styles.feature}>
                <LucideByName name={item.iconKey} size={18} className={styles.featureIcon} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </MotionReveal>
      <HomeCatalogShowcase />
    </div>
  );
}
