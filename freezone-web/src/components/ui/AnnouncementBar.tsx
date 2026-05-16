"use client";

import { usePublicSite } from "@/components/providers/StorefrontProvider";
import { ScrollingMarqueeBar } from "@/components/ui/ScrollingMarqueeBar";
import styles from "./AnnouncementBar.module.css";

/** Twin scrolling strips above the navbar: promo offers + store info ticker. */
export function AnnouncementBar() {
  const site = usePublicSite();
  const strips = site.marqueeStrips?.filter((s) => s.enabled) ?? [];

  if (strips.length === 0) return null;

  return (
    <div className={styles.stack} aria-label="Announcements">
      {strips.map((strip) => (
        <ScrollingMarqueeBar key={strip.id} strip={strip} />
      ))}
    </div>
  );
}
