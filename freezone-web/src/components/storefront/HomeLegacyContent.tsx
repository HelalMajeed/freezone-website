"use client";

import styles from "@/app/locale/page.module.css";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { trustBarChromeStyle } from "@/lib/layout-cms";
import { LucideByName } from "@/lib/lucide-icon-map";
import { MotionReveal } from "@/components/motion/MotionReveal";

/**
 * Minimal homepage when no CMS `homeSections` are published.
 * Marketing blocks (hero, strips, showcases, FAQ, etc.) were removed from the visitor UI by request;
 * rebuild the page from Admin → بناء الصفحة الرئيسية / إعدادات الموقع when ready.
 */
export function HomeLegacyContent() {
  const { home } = useStorefront();

  return (
    <div className={styles.home}>
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
    </div>
  );
}
