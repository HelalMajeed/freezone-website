"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "@/i18n/hooks";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@/navigation";
import styles from "./BrandTicker.module.css";
import { BRANDS } from "@/lib/data";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { EASE_OUT } from "@/lib/motion";

type BrandRow = { name: string; img: string | null };

type BrandTickerProps = {
  title?: string;
};

/** Slug for /public/brands/{slug}.svg and Simple Icons CDN (lowercase a-z0-9). */
function brandSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function logoCandidateUrls(name: string, explicitImg: string | null): string[] {
  const out: string[] = [];
  const push = (u: string) => {
    const t = u.trim();
    if (t && !out.includes(t)) out.push(t);
  };
  if (explicitImg?.trim()) push(explicitImg.trim());
  const slug = brandSlug(name);
  if (slug.length >= 2) {
    push(`/brands/${slug}.svg`);
    push(`https://cdn.simpleicons.org/${slug}/374151`);
  }
  return out;
}

function BrandLogo({ name, explicitImg }: { name: string; explicitImg: string | null }) {
  const candidates = useMemo(() => logoCandidateUrls(name, explicitImg), [name, explicitImg]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [name, explicitImg]);

  if (candidates.length === 0 || index >= candidates.length) {
    return <span className={styles.brandName}>{name}</span>;
  }

  return (
    <img
      src={candidates[index]}
      alt={name}
      className={styles.brandImg}
      loading="lazy"
      decoding="async"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

function buildMarqueeSequence(brands: BrandRow[], reduceMotion: boolean): BrandRow[] {
  if (reduceMotion || brands.length === 0) return brands;
  const copies = brands.length < 8 ? 3 : 2;
  return Array.from({ length: copies }, () => brands).flat();
}

function MarqueeRow({
  brands,
  direction,
  durationSec,
  reduceMotion,
}: {
  brands: BrandRow[];
  direction: "left" | "right";
  durationSec: number;
  reduceMotion: boolean;
}) {
  const sequence = buildMarqueeSequence(brands, reduceMotion);
  const copies = reduceMotion ? 1 : brands.length < 8 ? 3 : 2;
  const shiftPct = copies === 3 ? 33.333 : 50;

  const trackClass = reduceMotion
    ? styles.marqueeTrackStatic
    : direction === "left"
      ? styles.marqueeTrackLeft
      : styles.marqueeTrackRight;

  return (
    <motion.div
      className={styles.marqueeViewport}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
    >
      <div
        className={trackClass}
        style={
          reduceMotion
            ? undefined
            : ({
                ["--brand-marquee-duration" as string]: `${durationSec}s`,
                ["--brand-marquee-shift" as string]: `${shiftPct}%`,
              } as React.CSSProperties)
        }
      >
        {sequence.map((brand, i) => (
          <Link
            href={`/products?brand=${encodeURIComponent(brand.name)}`}
            key={`${brand.name}-${i}`}
            className={styles.brandTile}
            draggable={false}
          >
            <BrandLogo name={brand.name} explicitImg={brand.img} />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

export function useBrandTickerRows() {
  const { catalog } = useStorefront();
  return useMemo<BrandRow[]>(() => {
    if (catalog.brands.length > 0) {
      return catalog.brands.map((b) => ({ name: b.name, img: b.img }));
    }
    const seen = new Set<string>();
    const out: BrandRow[] = [];
    for (const p of catalog.products) {
      const name = p.brand?.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({ name, img: null });
    }
    if (out.length > 0) return out;
    return BRANDS.map((b) => ({ name: b.name, img: b.img }));
  }, [catalog.brands, catalog.products]);
}

export function BrandTicker({ title }: BrandTickerProps = {}) {
  const t = useTranslations("Home");
  const reduceMotion = useReducedMotion();
  const brands = useBrandTickerRows();

  if (brands.length === 0) return null;

  const mid = Math.ceil(brands.length / 2);
  const rowA = brands.slice(0, mid);
  const rowB = brands.slice(mid);
  const displayTitle = title?.trim() || t("popularBrands");

  return (
    <motion.section
      className={styles.section}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
    >
      <div className="container">
        <header className={styles.header}>
          <p className={styles.eyebrow}>{t("brandsEyebrow")}</p>
          <h2 className={styles.title}>{displayTitle}</h2>
        </header>
      </div>

      <div className={styles.tickerSection}>
        {rowA.length > 0 && (
          <MarqueeRow brands={rowA} direction="left" durationSec={52} reduceMotion={!!reduceMotion} />
        )}
        {rowB.length > 0 && (
          <MarqueeRow brands={rowB} direction="right" durationSec={38} reduceMotion={!!reduceMotion} />
        )}
      </div>
    </motion.section>
  );
}
