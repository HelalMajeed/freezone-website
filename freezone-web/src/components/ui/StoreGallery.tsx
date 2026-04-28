"use client";

import styles from "./StoreGallery.module.css";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";

const STATIC_FALLBACK: string[] = [
  "https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=800",
  "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=600",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600",
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200",
];

type Tile = { url: string; title: string };

/** Picks tiles for the bento layout (min 4). Uses admin `ShowroomMedia` when present. */
function pickGalleryTiles(
  items: { url: string; kind: string; title: string }[],
  fallbackTitle: string,
): Tile[] {
  const imgs = items.filter(
    (s) => s.kind !== "video" && (s.url ?? "").trim() !== "",
  );
  const base: Tile[] = imgs.map((s) => ({
    url: s.url,
    title: (s.title || "").trim() || fallbackTitle,
  }));
  if (base.length >= 4) return base.slice(0, 4);
  if (base.length === 0) {
    return STATIC_FALLBACK.map((url) => ({ url, title: fallbackTitle }));
  }
  const merged = [...base];
  let i = 0;
  while (merged.length < 4) {
    merged.push({
      url: STATIC_FALLBACK[i % STATIC_FALLBACK.length],
      title: fallbackTitle,
    });
    i++;
  }
  return merged.slice(0, 4);
}

export function StoreGallery() {
  const t = useTranslations("Home");
  const locale = useLocale();
  const { home } = useStorefront();
  const pc = home.pageCopy;
  const ar = locale === "ar";
  const heading =
    (ar ? pc?.showroomTitleAr?.trim() : pc?.showroomTitleEn?.trim()) ||
    (ar ? pc?.showroomTitleEn?.trim() : pc?.showroomTitleAr?.trim());
  const sub =
    (ar ? pc?.showroomDescAr?.trim() : pc?.showroomDescEn?.trim()) ||
    (ar ? pc?.showroomDescEn?.trim() : pc?.showroomDescAr?.trim());
  const fallbackTitle = t("ourShowroom");
  const tiles = pickGalleryTiles(home.showroom, heading || fallbackTitle);

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>{heading || fallbackTitle}</h2>
          <p className={styles.subtitle}>{sub || t("showroomDesc")}</p>
        </div>

        <div className={styles.bentoGrid}>
          <div className={`${styles.bentoItem} ${styles.itemLarge}`}>
            <img src={tiles[0]?.url} alt={tiles[0]?.title ?? ""} className={styles.image} />
          </div>
          <div className={`${styles.bentoItem} ${styles.itemSmall1}`}>
            <img src={tiles[1]?.url} alt={tiles[1]?.title ?? ""} className={styles.image} />
          </div>
          <div className={`${styles.bentoItem} ${styles.itemSmall2}`}>
            <img src={tiles[2]?.url} alt={tiles[2]?.title ?? ""} className={styles.image} />
          </div>
          <div className={`${styles.bentoItem} ${styles.itemWide}`}>
            <img src={tiles[3]?.url} alt={tiles[3]?.title ?? ""} className={styles.image} />
          </div>
        </div>
      </div>
    </section>
  );
}
