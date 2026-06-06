"use client";

import { ArrowRight } from "lucide-react";
import { Link } from "@/navigation";
import { useLocale } from "@/i18n/hooks";
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";
import styles from "./PromoGrid.module.css";

/** FROZEN payload — see fz-ws1-backend/docs/API_CONTRACTS.md §(j) `promo_grid`. */
type PromoTile = {
  id: string;
  title: string;
  sub: string;
  cta: string;
  imageUrl: string;
  href: string;
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pick(locale: "en" | "ar", ar: unknown, en: unknown): string {
  return locale === "ar" ? str(ar) || str(en) : str(en) || str(ar);
}

const LAYOUT_CLASS: Record<string, string> = {
  "2x2": styles.layout2x2,
  "3x1": styles.layout3x1,
  "1+2": styles.layout1p2,
};

export function PromoGrid({ payload }: { payload: Record<string, unknown> }) {
  const locale = useLocale() as "en" | "ar";
  const layout = typeof payload.layout === "string" && LAYOUT_CLASS[payload.layout]
    ? payload.layout
    : "2x2";

  const tiles: PromoTile[] = [];
  if (Array.isArray(payload.items)) {
    for (let i = 0; i < payload.items.length && tiles.length < 6; i++) {
      const raw = payload.items[i];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const it = raw as Record<string, unknown>;
      const imageUrl = str(it.imageUrl).trim();
      const href = str(it.href).trim();
      if (!imageUrl || !href) continue;
      tiles.push({
        id: str(it.id) || `promo-${i}`,
        title: pick(locale, it.titleAr, it.titleEn),
        sub: pick(locale, it.subAr, it.subEn),
        cta: pick(locale, it.ctaAr, it.ctaEn),
        imageUrl,
        href,
      });
    }
  }

  if (tiles.length === 0) return null;

  return (
    <section className={`container ${styles.section}`}>
      <div className={`${styles.grid} ${LAYOUT_CLASS[layout]}`}>
        {tiles.map((tile, i) => (
          <Link key={tile.id} href={tile.href} className={styles.tile} prefetch>
            <ResponsiveImage
              src={tile.imageUrl}
              alt={tile.title}
              className={styles.image}
              sizes="(max-width: 720px) 100vw, 50vw"
              priority={i === 0}
            />
            <div className={styles.scrim} aria-hidden />
            <div className={styles.copy}>
              {tile.title ? <h3 className={`fz-type-h3 ${styles.title}`}>{tile.title}</h3> : null}
              {tile.sub ? <p className={`fz-type-small ${styles.sub}`}>{tile.sub}</p> : null}
              {tile.cta ? (
                <span className={styles.cta}>
                  {tile.cta}
                  <ArrowRight size={14} className={styles.ctaArrow} aria-hidden />
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
